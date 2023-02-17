"use strict";

/*
TODO:
better tune octave options
  not all octaves have the same properties
*/

class App {
  static symbols = {
    note: '\u{266A}',
    division: '\u{00F7}',
    arrow: '\u{1F8A0}'
  };


  constructor() {
    this.UI = {};
    this.octaves = [];
    this.maxOctaveIndex = -1;

    this.upgrades = {
      autoSpeed: {baseCost: 2, costFactor: 2, basePower: 60, powerFactor: 0.9},
      autoValue: {baseCost: 2, costFactor: 2, basePower: 60, powerFactor: 0.9},
      autoCoda: {baseCost: 2, costFactor: 2, basePower: 60, powerFactor: 0.9},
      codaMult: {baseCost: 2, costFactor: 2, basePower: 1, powerFactor: 1.2}
    };

    'octaveList,staticWindow,resetContainer,resetYes,resetNo'.split`,`.forEach( id => {
      this.UI[id] = document.getElementById(id);
    });
    

    this.loadFromStorage();

    while (this.octaves.length < 10) {
      this.maxOctaveIndex++;
      const newIndex = this.maxOctaveIndex;
      this.octaves.push(new Octave(this, newIndex, this.UI.octaveList));
    }

    this.initGlobalUI();

    this.audioInterface = new AudioInterface();

    setInterval(() => this.tick(), 1000/60);
    setInterval(() => this.saveToStorage(), 5000);

    //this.nextNote = 0;
    //setInterval(() => this.playNextNote(), 1000);

  }

  /*
  playNextNote() {
    const baseVol = Math.pow(1 - (this.nextNote / 12), 2);
    const highVol = Math.pow(this.nextNote / 12, 2);
    console.log(this.nextNote, baseVol, highVol);

    this.audioInterface.playFreq(Octave.noteFreqs[this.nextNote], 0.5, {mainVolume: highVol * 0.1});
    this.audioInterface.playFreq(Octave.noteFreqs[this.nextNote] * 2, 0.5, {mainVolume: baseVol * 0.1});
    this.nextNote = (this.nextNote + 1) % 12;
  }
  */
 
  loadFromStorage() {
    const rawState = localStorage.getItem('shepard_scale');

    this.state = {
      octaves: [],
      coda: 0,
      totalCoda: 0,
      upgradeLevels: {
        autoSpeed: 0,
        autoValue: 0,
        autoCoda: 0,
        codaMult: 0
      },
      autoSpeedLast: 0,
      autoValueLast: 0,
      autoCodaLast: 0,
      enables: {
        autoSpeed: true,
        autoValue: true,
        autoCoda: true,
        particles: true,
        audio: true
      }
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
    'autoSpeed,autoValue,autoCoda'.split`,`.forEach( u => {
      const name = `${u}EnableDiv`;
      if (this.UI[name]) {
        this.state.enables[u] = this.UI[name].checked;
      }
    });
    'particles,audio'.split`,`.forEach( e => {
      const name = `${e}EnableDiv`;
      if (this.UI[name]) {
        this.state.enables[e] = this.UI[name].checked;
      }
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

    'autoSpeed,autoValue,autoCoda'.split`,`.forEach( u => {
      const lastName = u + 'Last';
      const upgradeName = this.autoUpgradeToName(u);
      const timeElapsed = curTime - this.state[lastName];
      const maxTime = this.getUpgradeValue(u);
      const percent = Math.min(100 * timeElapsed / maxTime, 100);
      const percentName = u + 'Percent';
      this.state[percentName] = percent;
      if (timeElapsed >= maxTime) {
        this.state[lastName] = curTime;
        if (this.UI[`${u}EnableDiv`].checked) {
          this.octaves.some( o => {
            if (document.body.animate && this.UI.particlesEnableDiv.checked) {
              const fromRect = this.UI[`${u}ProgressContainer`].getBoundingClientRect();
              const toRect = o.UI[`oButton${upgradeName[0].toUpperCase() + upgradeName.substring(1)}`].getBoundingClientRect();
              this.createUpgradeParticle(fromRect.right, fromRect.top, toRect.right, toRect.top);
            }
            return o.buyUpgrade(upgradeName);
          });
        }
      }
    });


    let anyRemoved = false;
    this.octaves = this.octaves.filter( (o, i) => {
      o.update(curTime, i, anyRemoved);
      if (o.coda) {
        const codaDelta = this.getUpgradeValue('codaMult');
        this.state.coda += codaDelta;
        this.state.totalCoda += codaDelta;
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

    const gameLength = (new Date()).getTime() - this.state.gameStart;
    const gameTime = this.timeToObj(gameLength / 1000);
    const gameTimeStr = this.timeObjToLongStr(gameTime);
    this.UI.playTimeSpan.innerText = gameTimeStr;

    this.UI.codaCountSpan.innerText = this.state.coda;
    this.UI.totalCodaSpan.innerText = this.state.totalCoda;

    'autoSpeed,autoValue,autoCoda,codaMult'.split`,`.forEach( u => {
      this.UI[`${u}CostDiv`].innerText = this.getUpgradeCost(u);
      this.UI[`${u}ValueDiv`].innerText = this.getUpgradeValue(u);
      const percentName = u + 'Percent';
      const progress = this.state[percentName];
      this.UI[`${u}ProgressBar`].style.width = `${progress}%`;
    });

  }

  timeToObj(t) {
    const result = {};

    result.y = Math.floor(t / (365 * 24 * 60 * 60));
    t = t % (365 * 24 * 60 * 60);
    result.d = Math.floor(t / (24 * 60 * 60));
    t = t % (24 * 60 * 60);
    result.h = Math.floor(t / (60 * 60));
    t = t % (60 * 60);
    result.m = Math.floor(t / 60);
    t = t % 60;
    result.s = t;

    return result;
  }

  leftPad(value, padChar, minLen) {
    return padChar.repeat(Math.max(0, minLen - value.toString().length)) + value;
  }

  timeObjToLongStr(o) {
    return `${o.y} years ${this.leftPad(o.d, '0', 3)} days ${this.leftPad(o.h, '0', 2)} hours ${this.leftPad(o.m, '0', 2)} minutes ${this.leftPad(Math.floor(o.s), '0', 2)} seconds`;
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

  initGlobalUI() {

    let grad = 'linear-gradient(180deg, ';
    const gradSteps = 10;
    const gradSat = 50;
    const gradLum = 70;
    for (let i = 0; i <= gradSteps; i++) {
      grad += `hsl(${360 * i / gradSteps},${gradSat}%,${gradLum}%) ${100 * i/gradSteps}%,`;
    }
    grad = grad.substring(0, grad.length - 1) + ')';
    this.UI.staticWindow.style.background = grad;


    const codaCountDiv = this.createElement('div', 'codaCountDiv', this.UI.staticWindow, '', 'Coda count: ');
    const codaCountSpan = this.createElement('span', 'codaCountSpan', codaCountDiv, '', '');

    const upgradeGrid = this.createElement('div', 'globalUpgradeGrid', this.UI.staticWindow, '', ''); 
    const upgradeGridL0 = this.createElement('div', 'globalUpgradeGridL0', upgradeGrid, '', 'Progress');
    const upgradeGridL1 = this.createElement('div', 'globalUpgradeGridL1', upgradeGrid, '', 'Buy');
    const upgradeGridL2 = this.createElement('div', 'globalUpgradeGridL2', upgradeGrid, '', 'Cost (coda)');
    const upgradeGridL3 = this.createElement('div', 'globalUpgradeGridL3', upgradeGrid, '', 'Value');
    const upgradeGridL4 = this.createElement('div', 'globalUpgradeGridL4', upgradeGrid, '', 'Enable');

    'autoSpeed,autoValue,autoCoda,codaMult'.split`,`.forEach( u => {
      const progressContainer = this.createElement('div', `${u}ProgressContainer`, upgradeGrid, 'gProgressContainer', '');
      const progressBar = this.createElement('div', `${u}ProgressBar`, progressContainer, 'gProgressBar', '');
      const rowButton = this.createElement('button', `${u}Button`, upgradeGrid, 'buttonGlobalUpgrade', (u === 'codaMult' ? '+' : '-') + u);
      const costDiv = this.createElement('div', `${u}CostDiv`, upgradeGrid, '', '');
      const curValue = this.createElement('div', `${u}ValueDiv`, upgradeGrid, '', 'value');
      if (u !== 'codaMult') {
        const enabled = this.createElement('input', `${u}EnableDiv`, upgradeGrid, 'gCheckboxEnable', 'enable');
        enabled.type = 'checkbox';
        enabled.checked = this.state.enables[u];

      }

      rowButton.onclick = () => this.buyUpgrade(u);
    });


    const playTimeDiv = this.createElement('div', 'playTimeDiv', this.UI.staticWindow, '', 'Total play time: ');
    const playTimeSpan = this.createElement('span', 'playTimeSpan', playTimeDiv, '', '');

    const totalCodaDiv = this.createElement('div', 'totalCodaDiv', this.UI.staticWindow, '', 'Total coda: ');
    const totalCodaSpan = this.createElement('span', 'totalCodaSpan', totalCodaDiv, '', '');

    'particles,audio'.split`,`.forEach( e => {
      const container = this.createElement('div', `${e}EnableContainer`, this.UI.staticWindow, '', '');
      const enable = this.createElement('input', `${e}EnableDiv`, container, '', '');
      enable.type = 'checkbox';
      enable.checked = this.state.enables[e];
      const label = this.createElement('span', `${e}EnableLabel`, container, '', `Enable ${e}`);
    });

    const resetButton = this.createElement('button', 'resetButton', this.UI.staticWindow, 'buttonUtil', 'Reset game');
    resetButton.onclick = () => this.UI.resetContainer.style.display = 'block';

    this.UI.resetNo.onclick = () => this.UI.resetContainer.style.display = 'none';
    this.UI.resetYes.onclick = () => this.reset();
  }

  getUpgradeValue(type) {
    if (type !== 'codaMult') {
      if (this.state.upgradeLevels[type] === 0) {
        return Infinity;
      }
    }
    return Math.round(this.upgrades[type].basePower * Math.pow(this.upgrades[type].powerFactor, this.state.upgradeLevels[type]));
  }

  getUpgradeCost(type) {
    return Math.round(this.upgrades[type].baseCost * Math.pow(this.upgrades[type].costFactor, this.state.upgradeLevels[type]));
  }

  buyUpgrade(type) {
    console.log('Gupgrade', type);
    const cost = this.getUpgradeCost(type);
    if (this.state.coda >= cost) {
      this.state.coda -= cost;
      this.state.upgradeLevels[type]++;
    }
  }

  autoUpgradeToName(type) {
    return {autoSpeed: 'speed', autoValue: 'value', autoCoda: 'coda'}[type];
  }

  createUpgradeParticle(x1, y1, x2, y2) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    //TODO: get better symbol
    particle.innerText = App.symbols.arrow;
    document.body.appendChild(particle);

    const size = 10;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    const animation = particle.animate([
      {
        transform: `translate(${x1 - size / 2}px, ${y1 - size / 2}px)`,
        opacity: 1
      },
      {
        transform: `translate(${x2 - size / 2}px, ${y2 - size / 2}px)`,
        opacity: 1,
        offset: 0.99
      },
      {
        transform: `translate(${x2 - size / 2}px, ${y2 - size / 2}px)`,
        opacity: 0
      }
    ], {
      duration: 2000,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay: Math.random() * 200
    });

    animation.onfinish = () => {
      particle.remove();
    };
  }

}

class Octave {
  static upgrades = {
    speed: {baseCost: 1, costFactor: 1.1, basePower: 1, powerFactor: 1.2},
    value: {baseCost: 1, costFactor: 1.1, basePower: 1, powerFactor: 1.2},
    coda: {baseCost: 1, costFactor: Infinity}
  };

  static noteFreqs = [ 261.63,277.18,293.66,311.13,329.63,349.23,369.99,392.00,415.30,440.00,466.16,493.88 ];

  constructor(app, index, parentElement, state) {
    this.app = app;
    this.index = index;
    this.noteIndex = index % 12;
    this.parentElement = parentElement;
    this.coda = false;

    this.colors = {};

    const hue = this.noteIndex * 360 / 12;
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

  getTimescale(stackIndex) {
    /*
    //timeScale equation is chosen so index of 0 returns 1 and index of 10+ returns 0
    const A = 1 / (1 - Math.pow(Math.E, -10));
    const timescale = Math.max(0, A*Math.pow(Math.E, -stackIndex) + (1 - A));
    return timescale;
    */
    return 1/([1, 3, 8, 20, 50, 150, 400, 1150, 3500, 12800, Infinity][stackIndex]);
  }

  update(curTime, stackIndex, snapshot) {
    this.curStackIndex = stackIndex;
    const timescale = this.getTimescale(stackIndex);
    const deltaTime = (curTime - this.state.baseTime) * timescale;
    //const deltaPercent = this.state.rate * deltaTime;
    const deltaPercent = this.getCurrentRate() * deltaTime;
    const lastCount = this.state.count;
    this.state.count = this.state.baseCount + this.getCurrentValue() * Math.floor((this.state.basePercent + deltaPercent) / 100);
    const deltaCount = this.state.count - lastCount;
    this.state.percent = (this.state.basePercent + deltaPercent) % 100;
    if (snapshot) {
      this.snapshot(curTime);
    }

    if (deltaCount > 0 && this.getCurrentRate() < 1000) {
      if (document.body.animate && this.app.UI.particlesEnableDiv.checked) {
        const rect = this.UI.oProgressContainer.getBoundingClientRect();
        this.createParticle(rect.right, rect.top);

      }

      if (this.app.UI.audioEnableDiv.checked) {
        const baseVol = Math.pow(1 - (this.noteIndex / 12), 2);
        const highVol = Math.pow(this.noteIndex / 12, 2);

        this.app.audioInterface.playFreq(Octave.noteFreqs[this.noteIndex], 0.5, {mainVolume: highVol * 0.1});
        this.app.audioInterface.playFreq(Octave.noteFreqs[this.noteIndex] * 2, 0.5, {mainVolume: baseVol * 0.1});
      }
    }


    this.UI.oButtonSpeed.disabled = this.getUpgradeCost('speed') > this.state.count;
    this.UI.oButtonValue.disabled = this.getUpgradeCost('value') > this.state.count;
    this.UI.oButtonCoda.disabled = this.getUpgradeCost('coda') > this.state.count;
  }

  draw() {
    this.UI.oStatCountSpan.innerText = this.state.count;
    if (this.curStackIndex === 0) {
      this.UI.oStatSpeedSpan.innerText = `${this.getCurrentRate()}`;
    } else {
      const timescale = this.getTimescale(this.curStackIndex);
      this.UI.oStatSpeedSpan.innerText = `${this.getCurrentRate()} ( ${App.symbols.division} ${(1/timescale).toFixed(0)})`;
    }
    this.UI.oStatValueSpan.innerText = this.getCurrentValue();
    if (this.getCurrentRate() < 1000) {
      this.UI.oProgressBar.style.width = `${this.state.percent}%`;
      this.UI.oProgressContainer.style.filter = '';
    } else {
      this.UI.oProgressBar.style.width = `100%`;
      this.UI.oProgressContainer.style.filter = 'blur(2px)';
    }
    this.UI.oButtonSpeed.innerText = `+Speed ${App.symbols.note} ${this.getUpgradeCost('speed')}`;
    this.UI.oButtonValue.innerText = `+Value ${App.symbols.note} ${this.getUpgradeCost('value')}`;
    this.UI.oButtonCoda.innerText = `+Coda ${App.symbols.note} ${this.getUpgradeCost('coda')}`;
  }

  createParticle(x, y) {
    //based on https://css-tricks.com/playing-with-particles-using-the-web-animations-api/
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.innerText = App.symbols.note;
    document.body.appendChild(particle);

    const size = 10;

    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    //particle.style.background = 'red';

    const dx = x + 10 * Math.sin(Math.random() * 2 * Math.PI);
    const dy = y - 40 - 20 * Math.random();

    const animation = particle.animate([
      {
        transform: `translate(${x - size/2}px, ${y - size/2}px)`,
        opacity: 1
      },
      {
        transform: `translate(${dx}px, ${dy}px)`,
        opacity: 0
      }
    ], {
      duration: 1000 + Math.random() * 1000,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay: Math.random() * 200
    });

    animation.onfinish = () => {
      particle.remove();
    };
  }

  getUpgradeCost(type) {
    const typeInfo = Octave.upgrades[type];
    return Math.round(typeInfo.baseCost * Math.pow(typeInfo.costFactor, this.state.upgradeLevels[type]));
  }

  buyUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    if (this.state.count >= cost) {
      console.log('upgrade', type, this.index );
      this.state.count -= cost;
      this.state.upgradeLevels[type]++;
      this.coda = type === 'coda';
      this.snapshot((new Date()).getTime() / 1000);
      return true;
    }
    return false;
  }
}

class AudioInterface {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.samplesDB = {};
  }

  playFreq(freq, duration, passedOpts) {
    const audioCtx = this.ctx;
    const sampleRate = audioCtx.sampleRate;
  
    let myArrayBuffer;
    if (this.samplesDB[freq] === undefined) {

      const options = {...{
        type: 'sine',
        fadeInTime: 0.05,
        mainVolume: 0.1,
        channels: 1,
        continuous: false,
        side: 3, //0 = none, 1 = left, 2 = right, 3 = both
        t0: 0, //initial time
        a0: [0] //initial value
      }, ...passedOpts};

      const fadeInSamples = options.fadeInTime *  sampleRate;

      const frameCount = audioCtx.sampleRate * duration;

      myArrayBuffer = audioCtx.createBuffer(options.channels, frameCount, audioCtx.sampleRate);
      //const finalValues = (new Array(options.channels)).fill(0);
      for (let channel = 0; channel < options.channels; channel++) {
    
        if (((1 << channel) & options.side) === 0) {continue;} 
    
        // This gives us the actual array that contains the data
        const nowBuffering = myArrayBuffer.getChannelData(channel);

        const components = [
          {type: options.type, freq: freq, vol: 1.0}
        ];
        const totalVolume = components.reduce((a,e) => a + e.vol, 0);
        const volumeScale = options.mainVolume / totalVolume;
        components.forEach(component => {
          for (let i = 0; i < frameCount; i++) {
            // audio needs to be in [-1.0; 1.0]
            const t = i / sampleRate;
            let vol;
            if (options.continuous) {
              vol = component.vol;
            } else {
              const fadeSamples = sampleRate * 0.01;
              //this fade is tiny just to avoid clipping on start/stop
              if (i < fadeSamples) {
                vol = component.vol * i / fadeSamples;
              } else if (i + fadeSamples > frameCount) {
                vol = component.vol * (frameCount - i) / fadeSamples;
              } else {
                vol = component.vol;
              }
            }
         
            if (i < fadeInSamples) {
              vol *= vol * i / fadeInSamples;
            }

            if (i > (frameCount - fadeInSamples)) {
              vol *= vol * (frameCount - i) / fadeInSamples;
            }
         
            switch (component.type) {
              case 'sine':
                const freq = component.freq;
                nowBuffering[i] += volumeScale * vol * Math.sin(freq * 2 * Math.PI * (t + options.t0));
                break;
              case 'seq':
                component.notes.forEach( note => {           
                  if (t >= note.start && t < note.stop) {
                    const fadeTime = 0.1;
                    const fadeVolume = Math.tanh((t-fadeTime/2)*6/fadeTime)+1;
                    nowBuffering[i] += fadeVolume * volumeScale * vol * Math.sin(note.freq * 2 * Math.PI * t);
                  }
                });
                break;
              case 'rnd':
                if (i === 0) {
                  nowBuffering[i] += options.a0[channel]; //volumeScale * vol * (Math.random() * 2 - 1);
                } else {           
                  const Fc = component.freq; //corner frequency of filter
                  const Ts = sampleRate; //sampling period
                  const RC = 1 / (2 * Math.PI * Fc);  //time constant
                  const alpha = (1/Ts) / (RC + 1/Ts); //smoothing factor
                  const newVal = volumeScale * vol * (Math.random() * 2 - 1);
                  nowBuffering[i] += alpha * newVal + (1-alpha) * nowBuffering[i-1];
                }
                break;
            }
           //finalValues[channel] = nowBuffering[i];
          }
        });
      }  

      this.samplesDB[freq] = myArrayBuffer;
    } else {
      myArrayBuffer = this.samplesDB[freq];
    }
    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    var source = audioCtx.createBufferSource();
    // set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;
    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(audioCtx.destination);
    // start the source playing
    
    source.start(audioCtx.currentTime);
    //return finalValues;
  }
}

const app = new App();
