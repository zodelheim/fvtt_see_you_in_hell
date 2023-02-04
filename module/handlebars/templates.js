export const preloadHandlebarsTemplates = async function () {
  // Define template paths to load
  const templatePaths = [
    `${game.system_path}/templates/sheets/items/armor-sheet.hbs`,
    `${game.system_path}/templates/sheets/items/equipment-sheet.hbs`,
    `${game.system_path}/templates/sheets/items/weapon-sheet.hbs`,

    `${game.system_path}/templates/sheets/actors/hero-sheet.hbs`,
    `${game.system_path}/templates/sheets/actors/enemy-sheet.hbs`,
    `${game.system_path}/templates/sheets/actors/npc-sheet.hbs`,

    `${game.system_path}/templates/dialogs/modify-attrs-roll.hbs`,
    `${game.system_path}/templates/dialogs/sheet-item-del.hbs`,

    `${game.system_path}/templates/chats/weapon-roll.hbs`,
    `${game.system_path}/templates/chats/attrs-roll.hbs`      
  ];

  // Load the template parts
  return loadTemplates(templatePaths); 
};