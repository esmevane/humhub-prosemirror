/*
 * @link https://www.humhub.org/
 * @copyright Copyright (c) 2017 HumHub GmbH & Co. KG
 * @license https://www.humhub.com/licences
 *
 */

import {inputRules, smartQuotes, emDash, ellipsis, InputRule} from "prosemirror-inputrules"
import {keymap} from "prosemirror-keymap"
import doc from "./doc"
import blockquote from "./blockquote"
import bullet_list from "./bullet_list"
import code from "./code"
import code_block from "./code_block"
import em from "./em"
import emoji from "./emoji"
import hard_break from "./hard_break"
import heading from "./heading"
import horizontal_rule from "./horizontal_rule"
import image from "./image"
import link from "./link"
import list_item from "./list_item"
import mention from "./mention"
import oembed from "./oembed"
import ordered_list from "./ordered_list"
import paragraph from "./paragraph"
import strikethrough from "./strikethrough"
import strong from "./strong"
import table from "./table"
import text from "./text"
import attributes from "./attributes"
import placeholder from "./placeholder"

const plugins = [];

const presets = {};

let registerPlugin = function(plugin) {
    plugins.push(plugin);
};

registerPlugin(doc);
registerPlugin(paragraph);
registerPlugin(blockquote);
registerPlugin(bullet_list);
registerPlugin(strong);
registerPlugin(code);
registerPlugin(code_block);
registerPlugin(emoji);
registerPlugin(hard_break);
registerPlugin(em);
registerPlugin(horizontal_rule);
registerPlugin(image);
registerPlugin(list_item);
registerPlugin(mention);
registerPlugin(oembed);
registerPlugin(ordered_list);
registerPlugin(heading);
registerPlugin(strikethrough);
registerPlugin(table);
registerPlugin(text);
registerPlugin(link);
registerPlugin(attributes);
registerPlugin(placeholder);

let getPlugins = function(options = {}) {

    if(options.preset && presets[options.preset]) {
        return  presets[options.preset].slice(0);
    }

    let result = [];
    if(!options.plugins || !options.plugins.exclude || !Array.isArray(options.plugins.exclude)) {
        result = plugins.slice(0);
    } else {
        let pluginFilter = (Array.isArray(options.plugins.exclude)) ? (plugin) => {
            return !options.plugins.exclude.includes(plugin.id)
        } : null;

        plugins.forEach((plugin) => {
            if(plugin && pluginFilter(plugin)) {
                result.push(plugin);
            }
        });
    }

    if(options.plugins && options.plugins.include && Array.isArray(options.plugins.include)) {
        result = result.concat(options.plugins.include);
    }

    if(options.preset) {
        presets[options.preset] = result;
        return result.slice(0);
    }

    return result;
};

let buildInputRules = function(options) {
    let plugins = getPlugins(options);
    let schema = options.schema;

    let rules = smartQuotes.concat([ellipsis, emDash]);
    plugins.forEach((plugin) => {
        if(plugin.inputRules) {
            rules = rules.concat(plugin.inputRules(schema));
        }
    });

    return inputRules({rules})
};

let buildPlugins = function(options) {
    let plugins = getPlugins(options);

    let result = [];
    plugins.forEach((plugin) => {
        if(plugin.plugins) {
            let pl = plugin.plugins(options);
            if(pl && pl.length) {
                result = result.concat(pl);
            }
        }
    });

    return result;
};

let buildPluginKeymap = function(options) {
    let plugins = getPlugins(options);

    let result = [];
    plugins.forEach((plugin) => {
        if(plugin.keymap) {
            result.push(keymap(plugin.keymap(options)));
        }
    });

    return result;
};


// https://github.com/ProseMirror/prosemirror/issues/710
const isChromeWithSelectionBug = !!navigator.userAgent.match(/Chrome\/(5[89]|6[012])/);

export {isChromeWithSelectionBug, buildPlugins, buildPluginKeymap, buildInputRules, registerPlugin, getPlugins}