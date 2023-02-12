"use strict";

/*
TODO:
*/

class App {
  constructor() {
    this.UI = {};

    this.UI.levelList = document.getElementById('levelList');
    this.UI.staticWindow = document.getElementById('staticWindow');

    this.loadFromStorage();

    setInterval(() => this.tick(), 1000/60);
    setInterval(() => this.saveToStorage(), 5000);

  }
 
  loadFromStorage() {
    const rawState = localStorage.getItem('shepard_scale');

    this.state = {
    };

    if (rawState !== null) {
      const loadedState = JSON.parse(rawState);
      this.state = {...this.state, ...loadedState};
    }

    this.saveToStorage();
  }

  saveToStorage() {
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
    
  }

  draw() {
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
  constructor(index, parentElement) {
    this.index = index;
    this.parentElement = parentElement;

    this.genHTML();
  }

  genHTML() {
    const topContainer = app.createElement('div', `ocontainer${this.index}`, 
      this.parentElement, 'octaveContainer', `Octave ${this.index}`);

  }
}

const app = new App();
