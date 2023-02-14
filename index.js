"use strict";

/*
TODO:
maintain record of total play time
add sound every time the progress bar gets to 100. the note based on octave value
*/

class App {
  constructor() {
    this.UI = {};

    this.UI.octaveList = document.getElementById('octaveList');
    this.UI.staticWindow = document.getElementById('staticWindow');

    this.itemList = "fire,youth,spear,tag,blade,team,flake,aide,lord,slope,depot,cacao,dart,cash,enemy,corn,chalk,brace,vodka,pit,beet,pay,group,usher,lad,bark,means,toot,owl,noun,pecan,query,belt,chip,tower,plow,lyre,cone,fate,feast,equal,envy,crop,giant,inbox,feel,stalk,yoga,down,eaves,color,guess,hit,epoxy,mix,stick,rider,cube,nuke,shop,class,prow,prior,flat,spine,fob,gun,wrap,manor,ore,right,inn,verb,swamp,cot,pain,fish,bead,tour,wheat,price,taco,yoyo,pupa,slash,song,pole,kitty,jeep,dump,deed,match,novel,bake,spell,toy,dozen,start,crate,lava,sand,perch,birch,oil,purse,uncle,cow,mass,leek,perp,snack,boar,fawn,seal,scene,wok,orchid,sheet,top,shore,tap,radar,text,prose,hire,ear,chap,drama,syrup,mud,kazoo,past,age,body,share,west,dog,treat,habit,wharf,wit,tenet,bread,depth,wave,whale,talk,fig,asset,turf,shed,lag,trout,upper,aside,craw,beach,glass,tale,finer,canal,blog,topic,loaf,kale,gold,info,claw,storm,need,hop,chaos,genre,tweet,lark,hide,maple,cap,chin,yam,wind,louse,aim,back,adobe,gown,smog,spud,dwell,floor,dune,grace,goat,owner,grill,front,aid,sash,tuber,pyramid,frost,icing,bulk,hill,venom,wine,clank,towel,skin,lieu,fold,meat,boot,level,derby,wheel,brood,short,bend,brand,jump,grin,cycle,bun,scope,wear,hold,glue,latte,stone,math,coat,purr,raft,pun,white,bug,wrong,wreck,slide,sprag,guava,torte,dryer,canoe,hobby,curl,yolk,fill,hope,slaw,mover,month,dip,coil,drive,light,chasm,pearl,pig,mango,media,drain,tune,madam,taste,dime,blast,paint,gnat,spot,roar,sail,film,panda,sill,dance,ham,pimp,pizza,hunt,kilt,tempo,bet,wifi,grain,net,rug,actor,hint,crow,brick,cub,mint,spite,potty,lily,glen,humor,snow,leaf,ferry,lipid,pad,pen,wild,yard,final,pupil,bath,waist,kite,elver,link,opera,unity,cello,clamp,wage,dare,put,grey,stand,troop,hound,merit,bride,thump,air,movie,puma,arrow,fund,bidet,row,poker,break,eye,heir,park,sonar,birth,cross,glee,hose,sense,niece,lane,cabin,monk,lace,fairy,quest,puppy,king,pond,bird,chill,fail,attic,foray,claim,proof,bail,bayou,pork,seed,basin,jack,print,hug,tub,hub,graft,liver,vest,lung,gem,donut,sari,patty,event,chord,wish,poem,stop,squid,oboe,fruit,show,bunch,sushi,mound,twist,south,meal,food,fiber,mark,wood".split`,`;

    this.octaves = [];
    this.maxOctaveIndex = -1;
    this.loadFromStorage();

    while (this.octaves.length < 10) {
      this.maxOctaveIndex++;
      const newIndex = this.maxOctaveIndex;
      this.octaves.push(new Octave(this, newIndex, this.itemList[newIndex % this.itemList.length], this.UI.octaveList));
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
    }

    this.state.octaves.forEach( os => {
      this.octaves.push(new Octave(this, os.index, this.itemList[os.index % this.itemList.length], this.UI.octaveList, os));
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
    this.octaves.forEach( o => {
      o.update(curTime);
    });
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
  constructor(app, index, currencyName, parentElement, state) {
    this.app = app;
    this.index = index;
    this.currencyName = currencyName;
    this.parentElement = parentElement;

    this.colors = {};

    const hue = index * 360 / 16;
    this.colors.bg = `hsl(${hue}, 50%, 50%)`;
    this.colors.barBg = `hsl(${hue}, 50%, 75%)`;
    this.colors.barFg = `hsl(${hue}, 50%, 25%)`;

    if (state) {
      this.state = state;
    } else {
      this.state = {
        index: this.index,
        count: 0,
        percent: 0,
        baseCount: 0,
        basePercent: 0,
        rate: 10 / index,
        baseTime: (new Date()).getTime() / 1000
      };
    }

    this.UI = {};

    this.genHTML();
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
    /*
      TODO:
        make name title case
        show upgrade buttons
        save/restore state
    */
    const topContainer = this.createElement('div', 'oContainer', this.parentElement, '', 
      `Octave ${this.index} - ${this.currencyName}`);

    const countContainer = this.createElement('div', 'oCountContainer', topContainer, 
      '', 'Steps: ');
    
    const countValue = this.createElement('span', 'oCountSpan', countContainer, '',
      this.state.count);

    const progressContainer = this.createElement('div', 'oProgressContainer', topContainer,
      '', '');

    const progressBar = this.createElement('div', 'oProgressBar', progressContainer, '', '');
      
    this.topContainer = topContainer;

    topContainer.style.background = this.colors.bg;
    progressContainer.style.background = this.colors.barBg;
    progressBar.style.background = this.colors.barFg;

    setTimeout(() => {
      topContainer.style.opacity = 1;
      topContainer.style.height = '5em';
    }, 0);
  }

  remove() {
    this.topContainer.style.opacity = 0;
    this.topContainer.style.height = 0;
  }

  update(curTime) {
    const deltaTime = curTime - this.state.baseTime;
    const deltaPercent = this.state.rate * deltaTime;
    this.state.count = this.state.baseCount + Math.floor(deltaPercent / 100);
    this.state.percent = this.state.basePercent + (deltaPercent % 100);
  }

  draw() {
    this.UI.oProgressBar.style.width = `${this.state.percent}%`;
    this.UI.oCountSpan.innerText = this.state.count;
  }
}

const app = new App();
