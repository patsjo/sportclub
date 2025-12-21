import { Control } from 'ol/control';

export class LayerListControl extends Control {
  private showLayerList: boolean;
  private setLayerListVisible: (visible: boolean) => void;

  constructor(options: { setLayerListVisible: (visible: boolean) => void }) {
    const button = document.createElement('button');
    button.innerHTML =
      '<svg viewBox="64 64 896 896" focusable="false" data-icon="unordered-list" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M912 192H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM104 228a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0z"></path></svg>';

    const element = document.createElement('div');
    element.className = 'ol-selectable ol-control ol-layerlist';
    element.appendChild(button);

    super({
      element: element
    });

    this.showLayerList = false;
    this.setLayerListVisible = options.setLayerListVisible;
    button.addEventListener('click', this.layerListOnOff.bind(this), false);
  }

  layerListOnOff() {
    this.showLayerList = !this.showLayerList;
    if (this.showLayerList) {
      this.element.className = 'ol-selectable ol-control ol-layerlist ol-layerlist-selected';
    } else {
      this.element.className = 'ol-selectable ol-control ol-layerlist';
    }
    this.setLayerListVisible(this.showLayerList);
  }
}
