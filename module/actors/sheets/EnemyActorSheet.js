import { BaseActorSheet } from "../BaseActorSheet.js";
import { genId } from "../../utils.js";

/**
 * Extend the base Actor document to support attributes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class EnemyActorSheet extends BaseActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [game.system.id, "sheet", "actor", "actor-enemy"],
      width: 720,
      height: 800,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "properties"}]
    });
  }

  /** @inheritdoc */
  getData(options) {
    const context = super.getData(options);

    context.systemData = context.data.system;
    context.config = CONFIG.CZT;

    context.isWeapons = context.systemData.items.filter((i) => i.type === "weapon");
    context.isArmor = context.systemData.items.filter((i) => i.type === "armor");
    context.isEquip = context.systemData.items.filter((i) => i.type === "equipment");
    context.items = context.systemData.items;

    console.log(context)
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.sheet-roll-weapon').click(evt => this._onActorRollWeapon(evt));
    html.find('.sheet-roll-attrs').click(evt => this._onActorRollAttrs(evt));

    html.find('.sheet-item-del').click(evt => this._onActorItemDel(evt));
  }

  async _extractItem(data) {

    if(Object.keys(data).includes("pack") && data.pack != "") {
      return await this._getDocumentByPack(data);
    }else if(data.type == "Item"){
      return game.items.get(data.id);
    }else if(data.type == "Actor") {
      return game.actors.get(data.id);
    }
  }
  
  async _onActorRollWeapon(evt) {
    evt.preventDefault();
    const weapon_id = $(evt.currentTarget).closest('tr').attr('item-id');
    const item = this.actor.system.items.filter((i) => i.type === "weapon" && i.id == weapon_id);
    const oItem = game.items.get(item[0].item_id);
    
    let roll = await new Roll(item[0].formula).roll({async: true});

    const html = await renderTemplate(`${game.system_path}/templates/chats/weapon-roll.hbs`, {
      item_name: item[0].name,
      img: item[0].img,
      dice: item[0].formula,
      desc: oItem.system.description,
      result: roll.result,
      total: roll.total
    });

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: html
    });
  }

  async checkAttr(attr, html) {
    // Оставлю себе для примера
    const actor_min = this.actor.system.attrs[attr].curr;
    const actor_max = this.actor.system.attrs[attr].max;

    const dices = html.find(`form input[name=count_dices]`).val();
    const mod = html.find(`form input[type=radio][name=modificator]:checked`).val();

    let roll = await new Roll(`${dices}d20`).evaluate({async: true});
    let sortedResults = roll.terms[0].results.map(r => {return r.result}).sort(function(a, b) {
      return b - a;});
    
      const tpl = await renderTemplate(`${game.system_path}/templates/chats/attrs-roll.hbs`, {
        terms: `${dices}d20`,
        row: sortedResults.join(', '),
        rmax: parseInt(sortedResults[0]),
        rmin: parseInt(sortedResults.slice(-1)),
        attr: attr,
        mod: mod,
        actor_min: parseInt(actor_min),
        actor_max: parseInt(actor_max),
        attrLabel: CONFIG.CZT.Attrs[attr]
      });
  
    ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: tpl
    });
  }

  async _onActorRollAttrs(evt) {
    evt.preventDefault();
    return false; // Заглушка
    const attrType = $(evt.currentTarget).attr('attr-type'); 

    const template = await renderTemplate(`${game.system_path}/templates/dialogs/attrs-roll.hbs`);
    return new Promise(resolve => {
      const data = {
        title: "", // game.i18n.localize("CZT.Common.CheckAttrs"),
        content: template,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("CZT.Common.Buttons.Cancel"),
            callback: html => resolve({cancelled: true})
          },
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("CZT.Common.Select.Yes"),
            callback: html => resolve(this.checkAttr(attrType, html))
           }        
        },
        default: "cancel",
        close: () => resolve({cancelled: true})
      }
      new Dialog(data, null).render(true);
    });
  }

  // Удаление предметов из инвентаря персонажа
  async _onActorItemDelConfirm(item_id, html) {
    var items = duplicate(this.actor.system.items);

    let newEquips = [];

    items.forEach(el => {
      if(el.id !== item_id) {
        newEquips.push(el);
      }
    });

    this.actor.update({"system.items": newEquips});
  }

  async _onActorItemDel(evt) {
    evt.preventDefault();
    const item_id = $(evt.currentTarget).closest('tr').attr('item-id');

    const tpl = await renderTemplate(`${game.system_path}/templates/dialogs/sheet-item-del.hbs`);
    return new Promise(resolve => {
      const data = {
        title: game.i18n.localize("CZT.Common.DelConfirm"),
        content: tpl,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("CZT.Common.Buttons.Cancel"),
            callback: html => resolve({cancelled: true})
          },
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("CZT.Common.Buttons.Remove"),
            callback: html => resolve(this._onActorItemDelConfirm(item_id, html))
           }        
        },
        default: "cancel",
        close: () => resolve({cancelled: true})
      }
      new Dialog(data, null).render(true);
    });
    
  }

  /** @override */
  _onDrop(evt) { 
    evt.preventDefault();
    const dragData = JSON.parse(evt.dataTransfer.getData("text/plain"));

    if(dragData.type != "Item") return;

    var item_id = dragData.uuid.replace("Item.", "");
    var item =  game.items.get(item_id);
    let items = this.actor.system.items;

    let newItem = {
      "id": genId(),
      "item_id": item_id,
      "name": item.name,
      "img": item.img,
      "type": item.type
    };

    items.push(newItem);
    this.actor.update({"system.items": items});
  }
  
}