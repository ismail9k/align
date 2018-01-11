import formats from './formats';
import icons from './icons';

class Styler {
  constructor(align, {
    mode = 'default',
    commands = ['bold', 'italic', 'underline']
  } = {}) {
    this.align = align;
    this.settings = {
      mode,
      commands
    };
    this.init();
  }

  static extend (name, extension) {
    formats[name] = extension;
  }

  /**
   * Create button HTML element
   * @param {String} name
   */
  static button(name) {
    const button = document.createElement('button');
    button.classList.add('styler-button');
    button.id = name;
    button.insertAdjacentHTML('afterbegin', `
      <svg class="icon" viewBox="0 0 24 24">
        <path d="${icons[name]}"/>
      </svg>
    `);
    return button;
  }

  /**
   * Create select options HTML element
   * @param {String} name
   * @param {Object} options
   */
  static select(name, options) {
    const select = document.createElement('select');
    select.classList.add('styler-select');
    select.id = name;
    options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.innerText = option.text;
      select.appendChild(optionElement);
    })
    return select;
  }

  /**
   * Create input HTML element
   * @param {String} name
   * @param {String} type
   */
  static input(name, type) {
    const input = document.createElement('input');
    input.classList.add(`styler-${name}`);
    input.id = name;
    input.type = type;
    return input;
  }

  /**
   * Create the styler toolbar
   */
  init() {
    this.styler = document.createElement('ul');
    this.styler.classList.add('styler', `is-${this.settings.mode}`);
    this.style = {};
    this.inits = {};
    this.align.el.appendChild(this.styler);

    this.settings.commands.forEach((el) => {
      const li = document.createElement('li');
      const current = formats[el];
      if (!current) {
        console.warn(el + ' is not found');
        return;
      }

      switch (current.element) {
        case 'button':
          this.style[el] = Styler.button(el);
          // some buttons don't have commands
          // instead it use functions form align class
          // here we detect which callback should be use
          const callBack =
            current.command
              ? this.execute.bind(this)
              : this.align[current.func].bind(this.align);

          this.style[el].addEventListener('click', () => {
            callBack(current.command, current.value);
          });
          li.appendChild(this.style[el]);
          break;

        case 'select':
          this.style[el] = Styler.select(el, current.options);
          this.style[el].addEventListener('change', () => {
            const selection = this.style[el];
            this.execute(current.command, selection[selection.selectedIndex].value);
          });
          li.appendChild(this.style[el]);
          break;
        case 'input':
          this.style[el] = Styler.input(el, current.type);
          this.style[el].addEventListener('change', () => {
            this.align.el.focus();
            this.execute(current.command, this.style[el].value);
          });
          li.appendChild(this.style[el]);
          break;

        case 'styling':
          li.classList.add(current.class);
          break;

        case 'custom':
          const markup = current.create();
          li.appendChild(markup);
          break;

        default:
          console.warn(el + ' is not found');
      }

      if (current.init) {
        this.inits[el] = new current.init(this.style[el], current.initConfig);
      }

      this.styler.appendChild(li);
    })

    if (this.settings.mode === 'bubble') this.initBubble();
  }

  initBubble() {
    this.styler.classList.add('is-hidden');
    this.reference = document.createElement('sapn');
  }
  /**
   * Execute command for the selected button
   * @param {String} cmd
   * @param {String|Number} value
   */
  execute(cmd, value) {
    if (this.align.HTML) return;
    document.execCommand(cmd, false, value);
    this.align.el.focus();
    this.updateStylerStates();
  }

  updateBubblePosition() {
    const position = this.selection.getBoundingClientRect();
    const deltaY = position.y - 70;
    const deltaX = position.x + (position.width / 2) - (this.styler.offsetWidth / 2)
    this.styler.style.top = `${deltaY > 0 ? deltaY : 0}px`
    this.styler.style.left = `${deltaX > 50 ? deltaX : 50}px`
  }

  showStyler() {
    this.styler.classList.add('is-visible');
    this.styler.classList.remove('is-hidden');
    this.updateBubblePosition();
  }

  hideStyler() {
    this.styler.classList.remove('is-visible');
    this.styler.classList.add('is-hidden');
  }

  updateStylerStates() {
    this.updateStylerCommands();
    if (this.settings.mode !== 'bubble') return;

    this.selection = window.getSelection().getRangeAt(0);
    if (this.selection.collapsed) {
      this.hideStyler();
      return;
    }
    this.showStyler();
  };

  /**
   * Update the state of the active style
   */
  updateStylerCommands() {
    Object.keys(this.style).forEach((styl) => {
      if (document.queryCommandState(styl)) {
        this.style[styl].classList.add('is-active');
        return;
      }
      if (document.queryCommandValue('formatBlock') === styl) {
        this.style[styl].classList.add('is-active');
        return;
      }
      if (document.queryCommandValue(styl) && document.queryCommandValue(styl) !== 'false') {
        this.style[styl].value = document.queryCommandValue(styl);
        return;
      }
      if (this.inits[styl]) {
        // if (this.inits[styl].isMenuActive) return;
        this.inits[styl].selectColor(document.queryCommandValue('foreColor'), true);
        return;
      }
      this.style[styl].classList.remove('is-active');
    })
  }
}

export default Styler;
