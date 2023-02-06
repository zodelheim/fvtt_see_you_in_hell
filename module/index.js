import { CZT } from "./config.js";
import { initializeHandlebars } from "./handlebars/init.js";
import { registerSettings } from "./settings.js";

import { ProxyItemSheet } from "./items/ProxyItemSheet.js";
import { ProxyItem } from "./items/ProxyItem.js";

import { ProxyActorSheet } from "./actors/ProxyActorSheet.js";
import { ProxyActor } from "./actors/ProxyActor.js";

Hooks.once("init", function () {
  console.log(game.system.id + " | init system");

  CONFIG.CZT = CZT;
  game.system_path = `systems/${game.system.id}`;

  CONFIG.Item.documentClass = ProxyItem;
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(game.system.id, ProxyItemSheet, {
    label: "CZT.Sheet.Item",
    makeDefault: true
  });

  CONFIG.Actor.documentClass = ProxyActor;
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(game.system.id, ProxyActorSheet, {
    label: "CZT.Sheet.Actor",
    makeDefault: true 
  });
  
  // Pre-load HTML templates
  initializeHandlebars();
  registerSettings();
});


Hooks.on("createItem", (itemData) => {

  if (itemData.type != 'cards') return;

  const imgPath = `${game.system_path}/assets/card_token.png`;

  itemData.img = imgPath;
  itemData.token.img = imgPath;
});


Hooks.on("renderChatLog", async (log, html, data) => {
  html.on("click", ".chat-reroll", async (ev) => {
    let button = $(ev.currentTarget),
      messageId = button.parents(".message").attr("data-message-id"),
      message = game.messages.get(messageId);

    let dices = button.parents(".message").find('.dice-rolls .die').text();
    const all_dices = dices.length;
    let dice_num = 0;
    let no_roll = [];

    dices.split("").forEach(element => {
      if(element > 1) {
        dice_num += 1;
      }else{
        no_roll.push(1);
      }
    });
    
    if(dice_num == 0) return;
    const formula = `${dice_num}d6`;
    let roll = await new Roll(formula).evaluate({async: false});
    console.log(roll)
    const template = await renderTemplate(`${game.system_path}/templates/chats/dices-reroll.hbs`, {
      result: roll.result,
      total: roll.total,
      terms: roll.terms[0].results,
      dice_num: dice_num,
      no_roll: no_roll,
      all_dices: all_dices
    });

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: template
    });


  });
});