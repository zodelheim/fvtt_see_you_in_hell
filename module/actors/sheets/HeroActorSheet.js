import { BaseActorSheet } from "../BaseActorSheet.js";
import { genId, getRandomInt } from "../../utils.js";

/**
 * Extend the base Actor document to support attributes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class HeroActorSheet extends BaseActorSheet {

  /* ---------------- Context Menu -------------- */
  itemCardMenu = [
    {
      name: game.i18n.localize("CZT.Common.Menu.Delete"),
      icon: '',
      callback: element => {
        this._onActorItemDelConfirm(element[0].dataset.id, "");
      }
    },
    {
      name: game.i18n.localize("CZT.Common.Menu.Success"),
      icon: '',
      callback: element => {
        this._onActorCardSuccess(element[0].dataset.id);
      }
    }
  ];
  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [game.system.id, "sheet", "actor", "actor-hero"],
      width: 720,
      height: 800
    });
  }

  /** @inheritdoc */
  getData(options) {
    const context = super.getData(options);

    context.systemData = context.data.system;
    context.config = CONFIG.CZT;
    context.isEquip = context.systemData.items.filter((i) => i.type === "equipment");
    context.isCards = context.systemData.items.filter((i) => i.type === "cards");

    console.log(context)
    return context;
  }

  async activateListeners(html) {
    super.activateListeners(html);

    new ContextMenu(html, '.cards-list li', this.itemCardMenu);

    html.find('.actor-fury-triangle i').click(evt => this._onCheckWound(evt));

    html.find('.roll-approach').click(evt => this._onActorRollApproach(evt));

    html.find('.sheet-item-del').click(evt => this._onActorItemDel(evt));

    html.find('.get-card').click(evt => this._onActorGetCard(evt));
  }

  async _extractItem(data) {

    const cmpnd_key = `Compendium.${game.system.id}.`;
    const cmpnd_len = cmpnd_key.length;
    const uuid = data.uuid;

    if(uuid.slice(0, cmpnd_len) === cmpnd_key) {
      const tmp = uuid.slice(cmpnd_len).split(".");
      const pack = game.packs.get(game.system.id + '.' + tmp[0]);
      return await pack.getDocument(tmp[1]);

    }else if(data.type == "Item"){
      var item_id = uuid.replace("Item.", "");
      return game.items.get(item_id);

    }else if(data.type == "Actor") {
      var actor_id = uuid.replace("Actor.", "");
      return game.actors.get(actor_id);
    }
  }
  
  async _onActorCardSuccess(card_id) {
    let items = duplicate(this.actor.system.items);
    items.forEach(el => {
      if(el.id === card_id ) {
        el.success = true;
      }
    });

    this.actor.update({"system.items": items});
  }

  async _onActorGetCard(evt) {
    evt.preventDefault();
    // Пробуем затащить из локальных карт, если нет, то из компендума
    let cards = game.items.filter((i) => i.type === "cards");
    let cards_len = cards.length;
    if(cards_len === 0) {
      const pack = game.packs.get(game.system.id + '.cards');
      cards = await pack.getDocuments();
      cards_len = cards.length;
    } 
    const rnd = getRandomInt(0, cards_len - 1);
    const item = cards[rnd];

    let items = duplicate(this.actor.system.items);

    let newItem = {
      "id": genId(),
      "item_id": item._id,
      "name": item.name,
      "img": item.img,
      "type": item.type,
      "description": item.system.description,
      "success": false
    };

    items.push(newItem);
    this.actor.update({"system.items": items});

    const html = await renderTemplate(`${game.system_path}/templates/chats/get-cards.hbs`, {
      card_name: item.name,
      card_desc: item.system.description
    });

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: html
    });
  }

  async _onCheckWound(evt) {
    evt.preventDefault();
    const wound_id = $(evt.currentTarget).attr('wound-name');
    const wound_current = duplicate(this.actor.system.wounds[wound_id]);
    const wound_new = !wound_current;
    await this.actor.update({ [`system.wounds.${wound_id}`] : wound_new});
  }

  async rollApproach(appr_id, appr_val, appr_mod, html) {
    const mod = html.find('select[name=set-mofidy] option:checked').val();
    const element = html.find('select[name=elements] option:checked').val();
    const myitem = html.find('input[name=myiteminuse]:checked').val();

    let dices = appr_mod; // подход
    dices += parseInt(mod); // select модификатор
    if (typeof myitem !== 'undefined') {
      dices += 1; // использую памятный предмет
    }

    if (parseInt(element) !== 0 ) {
      dices += 1; // использую элемент
    }

    const formula = `${dices}d6`;
    let roll = await new Roll(formula).evaluate({async: true});
    const template = await renderTemplate(`${game.system_path}/templates/chats/dices-roll.hbs`, {
      formula: formula,
      result: roll.result,
      total: roll.total,
      appr_id: appr_id,
      terms: roll.terms[0].results,
      appr_mod: appr_mod,
      myitem: (typeof myitem !== 'undefined')?true:false,
      element: (parseInt(element) !== 0 )?true:false,
      mod: mod
    });

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: template
    });
    
  }

  async _onActorRollApproach(evt) {
    evt.preventDefault();
    const appr_id = $(evt.currentTarget).attr('appr-id');
    const appr_val = $(evt.currentTarget).attr('appr-val');
    let appr_mod;

    const appr_curr = this.actor.system.approaches[appr_id];
    if(appr_val == appr_curr) {
      appr_mod = 2;
    }else{
      appr_mod = 1;
    }

    const template = await renderTemplate(`${game.system_path}/templates/dialogs/modify-attrs-roll.hbs`, {
      myiteminuse: this.actor.system.myitemInUse,
      conceptinuse: this.actor.system.conceptInUse,
      elements: this.actor.system.items.filter((i) => i.type === "equipment"),
      appr_val: appr_val,
      appr_id: appr_id,
      appr_mod: appr_mod
    });
    return new Promise(resolve => {
      const data = {
        title: game.i18n.localize("CZT.Rolls.Mod"),
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
            callback: html => resolve(this.rollApproach(appr_id, appr_val, appr_mod, html))
           }        
        },
        default: "cancel",
        close: () => resolve({cancelled: true})
      }
      new Dialog(data, null).render(true);
  });

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
      if(el.id !== item_id ) {
        newEquips.push(el);
      }
    });

    this.actor.update({"system.items": newEquips});
  }

  async _onActorItemDel(evt) {
    evt.preventDefault();
    const item_id = $(evt.currentTarget).closest('li').attr('item-id');

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
  async _onDrop(evt) { 
    evt.preventDefault();
    const dragData = JSON.parse(evt.dataTransfer.getData("text/plain"));
    
    if(dragData.type != "Item") return;

    var item = await this._extractItem(dragData);
    let items = this.actor.system.items;

    let newItem = {
      "id": genId(),
      "item_id": item._id,
      "name": item.name,
      "img": item.img,
      "type": item.type,
      "description": item.system.description
    };

    items.push(newItem);
    this.actor.update({"system.items": items});
  }

}