import { registerHandlebarsHelpers } from "./helpers.js";
import { preloadHandlebarsTemplates } from "./templates.js";

export const initializeHandlebars = () => {
  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();
};