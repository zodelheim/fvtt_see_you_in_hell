import { BaseItemSheet } from "../BaseItemSheet.js";

export class CardsItemSheet extends BaseItemSheet {
  
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [game.system.id, "sheet", "item", "item-cards"],
      width: 300,
      height: 440
    });
  }

}