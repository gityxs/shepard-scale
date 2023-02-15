"use strict";

/*
TODO:
add sound every time the progress bar gets to 100. the note based on octave value
figure out and implement some global options / stats
  buy new octaves
  get currency from octaves somehow, maybe just from ascending? 
add background image
blur progress bar if rate is too high
global options purchasable with coda points:
  auto buy speed rate
  auto buy value rate
  auto attempt coda rate
better tune octave options
particle effects when progress bar gets to end?
display total play time
display coda points
*/

class App {
  static symbols = {
    note: '\u{266A}'
  };

  constructor() {
    this.UI = {};

    this.UI.octaveList = document.getElementById('octaveList');
    this.UI.staticWindow = document.getElementById('staticWindow');

    this.octaves = [];
    this.maxOctaveIndex = -1;
    this.loadFromStorage();

    while (this.octaves.length < 10) {
      this.maxOctaveIndex++;
      const newIndex = this.maxOctaveIndex;
      this.octaves.push(new Octave(this, newIndex, this.UI.octaveList));
    }

    setInterval(() => this.tick(), 1000/60);
    setInterval(() => this.saveToStorage(), 5000);

  }
 
  loadFromStorage() {
    const rawState = localStorage.getItem('shepard_scale');

    this.state = {
      octaves: []
    };

    if (rawState !== null) {
      const loadedState = JSON.parse(rawState);
      this.state = {...this.state, ...loadedState};
    } else {
      this.state.gameStart = (new Date()).getTime();
    }

    this.state.octaves.forEach( os => {
      this.octaves.push(new Octave(this, os.index, this.UI.octaveList, os));
      this.maxOctaveIndex = Math.max(this.maxOctaveIndex, os.index);
    });

    this.saveToStorage();
  }

  saveToStorage() {
    this.state.octaves = [];
    this.octaves.forEach( o => {
      this.state.octaves.push(o.state);
    });
    const saveString = JSON.stringify(this.state);
    localStorage.setItem('shepard_scale', saveString);
  }

  reset() {
    localStorage.removeItem('shepard_scale');
    window.location.reload();
  }

  tick() {
    this.update();
    this.draw();
  }

  update() { 
    const curTime = (new Date()).getTime() / 1000;
    this.octaves.forEach( (o, i) => {
      o.update(curTime, i);
    });

    let anyRemoved = false;
    this.octaves = this.octaves.filter( (o, i) => {
      o.update(curTime, i, anyRemoved);
      if (o.coda) {
        //TODO: increment coda count
        o.remove();
        anyRemoved = true;
        return false;
      } else {
        return true;
      }
    });

    while (this.octaves.length < 10) {
      this.maxOctaveIndex++;
      const newIndex = this.maxOctaveIndex;
      this.octaves.push(new Octave(this, newIndex, this.UI.octaveList));
    }
  }

  draw() {
    this.octaves.forEach( o => {
      o.draw();
    });
  }

  createElement(type, id, parent, classes, text) { 
    const e = document.createElement(type); 
    e.id = id; 

    if (id in this.UI) { 
      throw `attempt to recreate element with id ${id}`;
    }

    this.UI[id] = e;

    if (parent !== undefined) {
      parent.appendChild(e); 
    }

    if (text !== undefined) {
      e.innerText = text; 
    }

    if (classes !== undefined && classes.length > 0) {
      classes.split`,`.forEach( className => {
        e.classList.add(className);
      }); 
    }

    return e; 
  } 

}

class Octave {
  static upgrades = {
    speed: {baseCost: 1, costFactor: 1.1, basePower: 1, powerFactor: 1.2},
    value: {baseCost: 1, costFactor: 1.1, basePower: 1, powerFactor: 1.2},
    coda: {baseCost: 1, costFactor: Infinity}
  };

  constructor(app, index, parentElement, state) {
    this.app = app;
    this.index = index;
    this.parentElement = parentElement;
    this.coda = false;

    this.colors = {};

    const hue = index * 360 / 16;
    this.colors.bg = `hsl(${hue}, 50%, 50%)`;
    this.colors.barBg = `hsl(${hue}, 50%, 75%)`;
    this.colors.barFg = `hsl(${hue}, 50%, 25%)`;
    this.colors.buttonBg = `hsl(${hue}, 50%, 75%)`;
    this.colors.buttonBgHover = `hsl(${hue}, 50%, 65%)`;
    this.colors.buttonBgDown = `hsl(${hue}, 50%, 85%)`;
    this.colors.buttonBorder = `hsl(${hue}, 50%, 25%)`;

    if (state) {
      this.state = state;
    } else {
      this.state = {
        index: this.index,
        count: 0,
        percent: 0,
        baseCount: 0,
        basePercent: 0,
        rate: 10,
        baseTime: (new Date()).getTime() / 1000,
        upgradeLevels: {
          speed: 0,
          value: 0,
          coda: 0
        }
      };
    }

    this.UI = {};

    this.genHTML();
  }

  snapshot(curTime) {
    this.state.baseTime = curTime;
    this.state.baseCount = this.state.count;
    this.state.basePercent = this.state.percent;
  }

  createElement(type, idRoot, parent, extraClasses, text) {
    let classesList = [idRoot];
    if (extraClasses !== undefined && extraClasses.length > 0) {
      classesList = classesList.concat(extraClasses.split`,`);
    }
    this.UI[idRoot] = this.app.createElement(type, `${idRoot}${this.index}`, parent, classesList.join`,`, text);
    return this.UI[idRoot];
  }

  genHTML() {
    const topContainer = this.createElement('div', 'oContainer', this.parentElement, '', '');

    const labelDiv = this.createElement('div', 'oLabel', topContainer, '', `Octave ${this.index}`);

    const statDiv = this.createElement('div', 'oStatDiv', topContainer, '', '');
    const statCountDiv = this.createElement('div', 'oStatCountDiv', statDiv, '', `Total ${App.symbols.note}:`);
    const statCountSpan = this.createElement('span', 'oStatCountSpan', statCountDiv, '', '');
    const statSpeedDiv = this.createElement('div', 'oStatSpeedDiv', statDiv, '', 'Speed:');
    const statSpeedSpan = this.createElement('span', 'oStatSpeedSpan', statSpeedDiv, '', '');
    const statValueDiv = this.createElement('div', 'oStatValueDiv', statDiv, '', 'Value:');
    const statValueSpan = this.createElement('span', 'oStatValueSpan', statValueDiv, '', '');

    const progressContainer = this.createElement('div', 'oProgressContainer', topContainer,
      '', '');

    const progressBar = this.createElement('div', 'oProgressBar', progressContainer, '', '');

    const upgradeContainer = this.createElement('div', 'oUpgradeContainer', topContainer,
      '', '');

    const speedButton = this.createElement('button', 'oButtonSpeed', upgradeContainer,
      '', '+Speed');

    const valueButton = this.createElement('button', 'oButtonValue', upgradeContainer,
      '', '+Value');

    const codaButton = this.createElement('button', 'oButtonCoda', upgradeContainer,
      '', 'Coda');

    speedButton.onclick = () => this.buyUpgrade('speed');
    valueButton.onclick = () => this.buyUpgrade('value');
    codaButton.onclick = () => this.buyUpgrade('coda');
    [speedButton, valueButton, codaButton].forEach( b => {
      b.onmouseenter = () => this.buttonHoverStart(b);
      b.onmouseleave = () => this.buttonHoverEnd(b);
      b.onmousedown = () => this.buttonDown(b);
      b.onmouseup = () => this.buttonUp(b);
      b.style.background = this.colors.buttonBg;
      b.style.borderColor = this.colors.buttonBorder;
    });

    this.topContainer = topContainer;

    topContainer.style.background = this.colors.bg;
    progressContainer.style.background = this.colors.barBg;
    progressBar.style.background = this.colors.barFg;

    setTimeout(() => {
      topContainer.style.opacity = 1;
      topContainer.style.height = '5em';
    }, 0);
  }

  buttonHoverStart(button) {
    button.style.background = this.colors.buttonBgHover;
  }

  buttonHoverEnd(button) {
    button.style.background = this.colors.buttonBg;
  }

  buttonDown(button) {
    button.style.background = this.colors.buttonBgDown;
  }

  buttonUp(button) {
    button.style.background = this.colors.buttonBg;
  }

  remove() {
    this.topContainer.style.opacity = 0;
    this.topContainer.style.height = 0;
    this.topContainer.style.padding = 0;
    this.topContainer.style.marginBottom = 0;
    setTimeout(() => this.topContainer.remove(), 1000);
  }

  getCurrentRate() {
    return Math.round(10 * Math.pow(1.2, this.state.upgradeLevels.speed));
  }

  getCurrentValue() {
    return Math.round(1 * Math.pow(1.2, this.state.upgradeLevels.value));
  }

  update(curTime, stackIndex, snapshot) {
    //timeScale equation is chosen so index of 0 returns 1 and index of 10+ returns 0
    const A = 1 / (1 - Math.pow(Math.E, -10));
    const timeScale = Math.max(0, A*Math.pow(Math.E, -stackIndex) + (1 - A));
    const deltaTime = (curTime - this.state.baseTime) * timeScale;
    //const deltaPercent = this.state.rate * deltaTime;
    const deltaPercent = this.getCurrentRate() * deltaTime;
    this.state.count = this.state.baseCount + this.getCurrentValue() * Math.floor((this.state.basePercent + deltaPercent) / 100);
    this.state.percent = (this.state.basePercent + deltaPercent) % 100;
    if (snapshot) {
      this.snapshot(curTime);
    }

    this.UI.oButtonSpeed.disabled = this.getUpgradeCost('speed') > this.state.count;
    this.UI.oButtonValue.disabled = this.getUpgradeCost('value') > this.state.count;
    this.UI.oButtonCoda.disabled = this.getUpgradeCost('coda') > this.state.count;
  }

  draw() {
    this.UI.oStatCountSpan.innerText = this.state.count;
    this.UI.oStatSpeedSpan.innerText = this.getCurrentRate();
    this.UI.oStatValueSpan.innerText = this.getCurrentValue();
    this.UI.oProgressBar.style.width = `${this.state.percent}%`;
    this.UI.oButtonSpeed.innerText = `+Speed ${App.symbols.note} ${this.getUpgradeCost('speed')}`;
    this.UI.oButtonValue.innerText = `+Value ${App.symbols.note} ${this.getUpgradeCost('value')}`;
    this.UI.oButtonCoda.innerText = `+Coda ${App.symbols.note} ${this.getUpgradeCost('coda')}`;
  }

  getUpgradeCost(type) {
    const typeInfo = Octave.upgrades[type];
    return Math.round(typeInfo.baseCost * Math.pow(typeInfo.costFactor, this.state.upgradeLevels[type]));
  }

  buyUpgrade(type) {
    console.log('upgrade', type);
    const cost = this.getUpgradeCost(type);
    if (this.state.count >= cost) {
      this.state.count -= cost;
      this.state.upgradeLevels[type]++;
      this.coda = type === 'coda';
      this.snapshot((new Date()).getTime() / 1000);
    }
  }
}


const app = new App();
