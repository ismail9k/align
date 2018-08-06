import { stringToDOM, swapArrayItems } from './partial/util'
import icons from './partial/icons';
import Figure from './components/figure';
import Table from './components/table';
import Link from './components/link';
import Selection from './selection';
import Dep from './dep';

export default class Section {
  constructor (align, content, {
    position,
    type = 'text'
  } = {}) {
    if (content && content.nodeName === 'BR') {
      return;
    }
    this.id = Section.id++
    this.$align = align;
    this.elements = [];
    this.settings = {
      customClass: [],
      modifiers: [],
      backgroundColor: '',
      backgroundVideo: '',
      backgroundImage: '',
      isHTMLView: false,
      type
    }
    if (typeof content === 'string') {
      content = stringToDOM(content);
    }
    this._initWrapper(content);
    this._initContent(content);
    if (this.settings.type === 'text') {
      this._initControllers();
      this._initBackground();
      this._initSettings();
      this.createLayout();
      this.el.addEventListener('click', () => {
        this.active();
      });
    }

    if (typeof position === 'number') {
      const before = this.$align.sections[position];
      this.$align.editor.insertBefore(this.el, before.el);
      this.$align.sections.splice(position, 0, this);
      return;
    }
    this.$align.editor.appendChild(this.el);
    this.$align.sections.push(this);
  }

  get content () {
    let output;
    if (this.settings.type === 'text') {
      output = this.el.cloneNode(true);
      const controllers = output.querySelector('.align-sectionControllers');
      const contentDiv = output.querySelector('.align-content');
      const figures = Array.from(contentDiv.querySelectorAll('figure'));
      if (this.settings.isHTMLView) {
        contentDiv.innerHTML = contentDiv.innerText;
      }
      figures.forEach(fig => Figure.render(fig));
      output.classList.remove('is-active');
      output.insertAdjacentHTML('beforeend', contentDiv.innerHTML);
      contentDiv.remove();
      controllers.remove();
    }
    if (this.settings.type === 'title') {
      return this.title.innerText;
    }
    return output.outerHTML;
  }

  _initWrapper (content) {
    this.el = document.createElement('div');
    this.el.classList.add('align-section');
    let classes = content ? content.classList : '';
    if (!classes) {
      return;
    }
    classes = Array.from(classes);
    classes.splice(classes.indexOf('align-section'), 1);
    this.classes = {
      modifiers: [],
      custom: []
    }
    classes.forEach(cls => {
      if (cls.startsWith('is-')) {
        this.classes.modifiers.push(cls);
        return;
      }
      if (cls.startsWith('has-')) {
        return;
      }
      this.classes.custom.push(cls);
    });
    this.el.classList.add(...this.classes.modifiers);
    this.el.setAttribute('style', content.getAttribute('style'));
    this.bgColor = content.style.backgroundColor;
  }

  _initContent (content) {
    switch (this.settings.type) {
    case 'text':
      if (!this.contentDiv) {
        this.contentDiv = document.createElement('div');
        this.contentDiv.classList.add('align-content');
        this.contentDiv.contentEditable = true;
      }
      if (this.settings.isHTMLView) {
        content = content.innerText;
      }
      if (!this.settings.isHTMLView) {
        content = content ? content.innerHTML : '<p></p>';
      }
      this.contentDiv.innerHTML = content;
      this.el.appendChild(this.contentDiv);
      this._initElements();
      break;

    case 'title':
      this.title = this.el.querySelector('.align-title') || document.createElement('h1');
      this.title.classList.add('align-title');
      this.title.contentEditable = true;
      this.title.innerText = content;
      this.el.appendChild(this.title);
      this.title.addEventListener('blur', () => {
        this.title.innerHTML = this.title.innerText
      })
      break;

    default:
      break;
    }
  }

  _initElements () {
    const figures = Array.from(this.contentDiv.querySelectorAll('figure'));
    const tables = Array.from(this.contentDiv.querySelectorAll('table'));
    const links = Array.from(this.contentDiv.querySelectorAll('a'));

    figures.forEach(figure => new Figure(this.$align, figure));
    tables.forEach(table => new Table(this.$align, table));
    links.forEach(link => new Link(this.$align, link));
  }

  _initControllers () {
    this.controllers = document.createElement('div');
    this.addButton = document.createElement('button');
    this.controllers.classList.add('align-sectionControllers');
    this.addButton.classList.add('align-sectionAdd');

    this.addButton.addEventListener('click', () => {
      const newSection = new Section(this.$align, '', { position: this.getIndex() });
      setTimeout(() => {
        newSection.active();
        Selection.selectElement(newSection.contentDiv.querySelector('p'));
      }, 1);
    });
    this.controllers.appendChild(this.addButton);
    this.el.appendChild(this.controllers);
  }

  _initBackground () {
    this.bgImage = this.bgImage || this.contentDiv.querySelector('.align-bgImage');
    this.bgVideo = this.bgVideo || this.contentDiv.querySelector('.align-bgVideo');

    if (this.bgImage) {
      this.el.classList.add('has-bgImage');
      this.el.insertAdjacentElement('afterBegin', this.bgImage);
      this.settings.backgroundImage = this.bgImage.url;
    }
    if (this.bgVideo) {
      this.el.classList.add('has-bgVideo');
      this.el.insertAdjacentElement('afterBegin', this.bgVideo);
      this.settings.backgroundVideo = this.bgVideo.querySelector('source').src;
    }
    if (this.bgColor) {
      this.el.classList.add('has-bgColor');
      this.el.style.backgroundColor = this.bgColor;
      this.settings.backgroundColor = this.bgColor;
    }
  }

  _initSettings () {
    Object.keys(this.settings).forEach(key => {
      let internalValue = this.settings[key]
      const dep = new Dep();
      
      Object.defineProperty(this.settings, key, {
        get() {
          dep.depend();
          return internalValue;
        },
        set(newVal) {
          const oldVal = internalValue;
          internalValue = newVal;
          dep.notify(oldVal);
        }
      });
    });
    Dep.watcher((oldVal) => {
      if (this.settings.customClass.length === 0) {
        return;
      }
      if (oldVal && oldVal.length > 0) {
        this.el.classList.remove(...oldVal);
      }
      this.el.classList.add(...this.settings.customClass);
    });
    Dep.watcher(() => {
      this.backgroundColor(this.settings.backgroundColor);
    });
    Dep.watcher(() => {
      this.backgroundImage(this.settings.backgroundImage);
    });
    Dep.watcher(() => {
      this.backgroundVideo(this.settings.backgroundVideo);
    });
  }

  getIndex () {
    return this.$align.sections.findIndex(el => el === this);
  }

  createLayout () {
    const el = this.el;
    const styleObj = {};
    const handler = {
      get (style, name) {
        this.update();
        return style[name] || '';
      },
      set (style, name, val) {
        if (val) {
          style[name] = val;
          el.style[name] =  val;
          return true
        }
        delete style[name];
        el.style[name] =  '';
        return true
      },
      update () {
        const sectionStyle = window.getComputedStyle(el);
        [
          'margin-top',
          'margin-right',
          'margin-bottom',
          'margin-left',
          'padding-top',
          'padding-right',
          'padding-bottom',
          'padding-left'
        ].forEach(styl => {
          const value = el.style[styl] ||sectionStyle[styl];
          if (value) {
            styleObj[styl] = value;
          }
        });
      }
    }
    this.style = new Proxy(styleObj, handler);
  }


  toggleHTML () {
    if (!this.settings.isHTMLView) {
      this.settings.isHTMLView = true;
      const content = document.createTextNode(this.contentDiv.innerHTML);
      const pre = document.createElement('pre');

      this.contentDiv.innerHTML = '';
      pre.dataset.alignHtml = true;
      pre.appendChild(content);
      this.contentDiv.appendChild(pre);
      this.$align.highlight();
      return;
    }
    this._initContent(this.contentDiv);
    this.settings.isHTMLView = false;
  }


  backgroundColor (color) {
    if (!color) {
      this.bgColor = null;
      this.el.style.backgroundColor = '';
      this.el.classList.remove('has-bgColor');
      return;
    }
    this.el.style.backgroundColor = color;

    this.bgColor = color;
    this.el.classList.add('has-bgColor');

    // emit events
    const index = this.getIndex();
    this.$align.$bus.emit('sectionChanged', { from: index, to: index });
    this.$align.$bus.emit('changed');
  }

  backgroundImage (file) {
    if (!file) {
      if (this.bgImage) {
        this.bgImage.remove();
        this.bgImage = null;
      }
      return;
    };
    let url = '';
    if (file instanceof File) {
      url = URL.createObjectURL(file);
    } else { 
      url = file;
    }

    if (!this.bgImage) {
      this.bgImage = document.createElement('div');
      this.bgImage.classList.add('align-bgImage');
      this.el.insertAdjacentElement('afterBegin', this.bgImage);
    }
    const update = (src) => {
      this.bgImage.style.backgroundImage = `url(${src})`;
    };
    this.bgImage.style.backgroundImage = `url(${url})`;
    this.el.classList.add('has-bgImage');
    this.$align.update();

    // emit events
    const index = this.getIndex();
    this.$align.$bus.emit('imageAdded', { file, update });
    this.$align.$bus.emit('sectionChanged', { from: index, to: index });
    this.$align.$bus.emit('changed');
  }

  backgroundVideo (file) {
    if (!file) {
      if (this.bgVideo) {
        this.bgVideo.remove();
        this.bgVideo = null;
      }
      return;
    }
    let url = '';
    if (file instanceof File) {
      url = URL.createObjectURL(file);
    } else { 
      url = file;
    }
    if (!this.bgVideo) {
      this.bgVideo = document.createElement('div');
      this.bgVideo.classList.add('align-bgVideo');
      this.bgVideo.insertAdjacentHTML('afterbegin', `<video autoplay muted loop></video>`);
      this.el.insertAdjacentElement('afterbegin', this.bgVideo);
    }
    const source = 
      this.bgVideo.querySelector('source') ||
      document.createElement('source');
    const video = this.bgVideo.querySelector('video');
    video.appendChild(source);
    source.src = url;
    video.load();
    video.play();
    this.el.classList.add('has-bgVideo');
    const update = (src) => {
      source.src = src;
    };
    this.$align.update();

    // emit events
    const index = this.getIndex();
    this.$align.$bus.emit('videoAdded', { file, update });
    this.$align.$bus.emit('sectionChanged', { from: index, to: index });
    this.$align.$bus.emit('changed');
  }

  moveUp () {
    const oldIndx = this.getIndex();
    if (
      !this.$align.sections[oldIndx - 1] ||
      this.$align.sections[oldIndx - 1].type === 'title'
    ) return;

    this.$align.editor.insertBefore(this.el, this.$align.sections[oldIndx - 1].el);
    swapArrayItems(this.$align.sections, oldIndx, oldIndx - 1);

    // emit events
    this.$align.$bus.emit('sectionChanged', { 
      from: oldIndx, to: this.getIndex()
    });
    this.$align.$bus.emit('changed');
  }

  moveDown () {
    const oldIndx = this.getIndex();
    if (!this.$align.sections[oldIndx + 1]) return;
    this.$align.editor.insertBefore(this.el, this.$align.sections[oldIndx + 1].el.nextSibling);
    swapArrayItems(this.$align.sections, oldIndx, oldIndx + 1);

    // emit events
    this.$align.$bus.emit('sectionChanged', { 
      from: oldIndx, to: this.getIndex()
    });
    this.$align.$bus.emit('changed');
  }

  active () {
    if (Section.activeSection === this) {
      this.$align.$sectionToolbar.update(this);
      return;
    }
    if (Section.activeSection) {
      Section.activeSection.inactive();
    }
    Section.activeSection = this;
    this.el.classList.add('is-active');
    this.$align.$sectionToolbar.update(this);
    this.$align.sidebar.update();
    this.$align.update();
    this.contentDiv.focus();
  }

  inactive () {
    this.el.classList.remove('is-active');
  }

  remove () {
    const oldIndx = this.getIndex();
    this.inactive();
    this.el.remove();
    this.$align.sections.splice(oldIndx, 1);
    this.$align.$sectionToolbar.hide();
    this.$align.update();

    // emit events
    this.$align.$bus.emit('sectionChanged', {
      from: oldIndx, to: null
    });
    this.$align.$bus.emit('changed');
  }

  duplicate () {
    const content = this.content;
    const newSection = new Section(this.$align, content, { position: this.getIndex() });

    // emit events
    this.$align.$bus.emit('sectionChanged', {
      from: null, to: this.getIndex()
    });
    this.$align.$bus.emit('changed');
  }

  static id = 0;
  static activeSection = null;
  static defaults = {
    mode: 'bubble',
    hideWhenClickOut: true,
    commands: [
      '_sectionUp',
      '_sectionDown',
      '_sectionToggleHTML',
      '_sectionDuplicate',
      { 
        element: 'classes',
        values: ['normal', 'full'],
        icons: ['sectionNormal', 'sectionFull']
      },
      'remove'
    ],
    tooltip: true,
    position: 'left-top'
  }
  
}
