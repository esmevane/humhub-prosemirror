import { Plugin } from 'prosemirror-state';
import { Node, Slice } from 'prosemirror-model'
import twemoji from "../../twemoji"
import {getParser} from "../../../markdown/parser"

const emojiPlugin = (options) => {
    let parser = getParser(options);
    return new Plugin({
        props: {
            /*transformPastedHTML: (html) => {
                let $html = $(html);
                let $dom = $('<body>').append($html);
                let test = $('<html>').append(twemoji.parse($dom[0])).html();
                debugger;
                return test
            },
            transformPastedText: (text) => {
                debugger;
                return twemoji.parse(text, {output: 'markdown'});
            },*/
            clipboardTextParser: $.proxy(parser.parse, parser),
            transformPasted: (slice) => {
                if(slice && slice instanceof Node && slice.type == options.schema.nodes.doc) {
                    return new Slice(slice.content, 0, 0)
                }

                return slice;
            }
        }
    });
}

export {emojiPlugin}