const utils = {
  unpackObject(propsPath, source) {
    if (propsPath.split('.').length === 1) {
      return source[propsPath];
    }
    let mockSource = source;
    return propsPath.split('.').reduce((a, b) => {
      a = a[b];
      return a;
    }, mockSource);
  },
  reDict: {
    event: /@\w+="\w+"/g,
    handleBar: /{{.+}}/g,
    tagsWithEvents: /<.*?@\w+=".+".*?>/g,
    tagsWithJModels: /<.*?j-model=".+".*?>/g,
    jModel: /j-model="\w+"/g,

    betweenQuotes: /".+"/g
  }
}



class App {
  constructor({ target, template, data = {}, methods = {}, windowListeners = {}, mounted = function(){} }) {

    this.vDom = {
      data: {},
      listen: {},
      models: {}
    }

    this._target = target;
    this._template = template || target.innerHTML;
    this._data = this.wrapData(data);
    this._methods = this.bindMethodsToData(methods);

    this.compileTemplate();
    this.setWindowListeners(windowListeners);
    this.isMounted(mounted);

  }

  isMounted(mounted) {
    const newMounted = mounted.bind(this._data);
    return newMounted();
  }

  setWindowListeners(windowListeners) {
    Object.entries(windowListeners).forEach(([eventName, handlerName]) => {
      document.addEventListener(eventName, this._methods[handlerName]);
    });
  }

  bindMethodsToData(methods) {
    return Object.keys(methods).reduce((accum, methodKey) => {
      accum[methodKey] = methods[methodKey].bind(this._data);
      return accum;
    }, {});
  }

  wrapData(data) {
    return Object.keys(data).reduce((accum, dataKey) => {
      Object.defineProperty(accum, dataKey, {
        get: () => data[dataKey],
        set: val => {
          data[dataKey] = val;
          this.updateTextContent(dataKey);
        }
      });
      return accum;
    }, {});
  }

  setJModelListeners() {
    const { models } = this.vDom;
    Object.keys(models).forEach(key => {
      const model = models[key];
      const targetEl = document.querySelector(`[data-model-id="${model.id}"]`);
      targetEl.addEventListener('input', (e) => {
        this._data[key] = e.target.value;
      })
    })
  }

  setListeners() {
    if (this._methods && Object.keys(this._methods).length > 0) {
      Object.keys(this.vDom.listen).forEach(key => {
        const listen = this.vDom.listen[key];
        const targetEl = document.querySelector(`[data-listen${listen.n}-id="${listen.id}"]`);
        targetEl.addEventListener(listen.eventName, this._methods[key.slice(1, -1)]);
      });
    }
  }

  updateTextContent(dataKey) {
    if (this.vDom.data[dataKey]) {
      const vDomElId = this.vDom.data[dataKey].id;
      if (vDomElId >= 0) {
        const newTextContent = utils.unpackObject(dataKey, this._data);
        document.querySelector(`[data-data-id="${vDomElId}"]`).textContent = newTextContent;
      }
    }
    
  }

  compileTemplate() {
    const { tagsWithJModels, jModel, tagsWithEvents, event, handleBar, betweenQuotes } = utils.reDict;

    let template = this._template;

    let dataIdCount = 0;
    let listenIdCount = 0;
    let modelIdCount = 0;

    const hdlBarValTags = template.match(handleBar);
    if (hdlBarValTags) {
      hdlBarValTags.forEach(item => {
        const hdlBar = item.match(handleBar)[0].slice(2, -2);
        const hdlBarVal = utils.unpackObject(hdlBar, this._data);
        const data = `data-data-id="${dataIdCount}"`;
        const withHdlBarVal = item.replace(handleBar, `<span ${data}>${hdlBarVal}</span>`);
        const final = withHdlBarVal;
        this.vDom.data[hdlBar] = {
          id: dataIdCount
        };
        template = template.replace(item, final);
        dataIdCount += 1
      });
    }

    const eventTags = template.match(tagsWithEvents);
    if (eventTags) {
      eventTags.forEach(item => {
        const evts = item.match(event);
        evts.forEach((evt, i) => {
          const eventName = evt.slice(1, evt.indexOf('='));
          const eventHandler = evt.slice(evt.indexOf('=') + 1);
          this.vDom.listen[eventHandler] = {
            id: listenIdCount,
            n: i,
            eventName,
          };
          template = template.replace(evt, `data-listen${i}-id="${listenIdCount}"`);
          listenIdCount += 1;
        });
      });      
    }

    const jModels = template.match(tagsWithJModels);
    if (jModels) {
      jModels.forEach(tag => {
        const directive = tag.match(jModel)[0];
        const whatToBindTo = directive.match(betweenQuotes)[0].slice(1, -1);
        this.vDom.models[whatToBindTo] = {
          id: modelIdCount,
        };
        template = template.replace(directive, `data-model-id="${modelIdCount}"`);
        modelIdCount += 1;
      });
    }    

    this._target.innerHTML = template;
    this.setListeners();
    this.setJModelListeners();
  }

}
