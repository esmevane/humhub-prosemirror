import {
    canInsert, wrapItem, blockTypeItem, Dropdown, DropdownSubmenu, joinUpItem, liftItem,
    selectParentNodeItem, undoItem, redoItem, icons, MenuItem, menuBar
} from "./menu/"

import {chainCommands, selectParentNode, setBlockType, toggleMark, wrapIn} from "prosemirror-commands"
import {wrapInList} from "prosemirror-schema-list"
import {TextField, openPrompt} from "./prompt"
import {insertImageItem} from "./plugins/image/menu"
import {addColumnAfter, addColumnBefore, deleteColumn, addRowAfter, addRowBefore, deleteRow, deleteTable,toggleHeaderRow} from "prosemirror-tables"


// Helpers to create specific types of items
function cmdItem(cmd, options) {
    let passedOptions = {
        label: options.title,
        run: cmd
    }
    for (let prop in options) passedOptions[prop] = options[prop]
    if ((!options.enable || options.enable === true) && !options.select)
        passedOptions[options.enable ? "enable" : "select"] = state => cmd(state)

    return new MenuItem(passedOptions)
}

function markActive(state, type) {
    let {from, $from, to, empty} = state.selection
    if (empty) return type.isInSet(state.storedMarks || $from.marks())
    else return state.doc.rangeHasMark(from, to, type)
}

function markItem(markType, options) {
    let passedOptions = {
        active(state) {
            return markActive(state, markType)
        },
        enable: true
    }
    for (let prop in options) passedOptions[prop] = options[prop]
    return cmdItem(toggleMark(markType), passedOptions)
}

function linkItem(markType) {
    return new MenuItem({
        title: "Add or remove link",
        icon: icons.link,
        active(state) {
            return markActive(state, markType)
        },
        enable(state) {
            return !state.selection.empty
        },
        run(state, dispatch, view) {
            if (markActive(state, markType)) {
                toggleMark(markType)(state, dispatch)
                return true
            }
            openPrompt({
                title: "Create a link",
                fields: {
                    href: new TextField({
                        label: "Link target",
                        required: true,
                        clean: (val) => {
                            if (!/^https?:\/\//i.test(val))
                                val = 'http://' + val
                            return val
                        }
                    }),
                    title: new TextField({label: "Title"})
                },
                callback(attrs) {
                    toggleMark(markType, attrs)(view.state, view.dispatch)
                    view.focus()
                }
            })
        }
    })
}

function wrapListItem(nodeType, options) {
    return cmdItem(wrapInList(nodeType, options.attrs), options)
}

// :: (Schema) → Object
// Given a schema, look for default mark and node types in it and
// return an object with relevant menu items relating to those marks:
//
// **`toggleStrong`**`: MenuItem`
//   : A menu item to toggle the [strong mark](#schema-basic.StrongMark).
//
// **`toggleEm`**`: MenuItem`
//   : A menu item to toggle the [emphasis mark](#schema-basic.EmMark).
//
// **`toggleCode`**`: MenuItem`
//   : A menu item to toggle the [code font mark](#schema-basic.CodeMark).
//
// **`toggleLink`**`: MenuItem`
//   : A menu item to toggle the [link mark](#schema-basic.LinkMark).
//
// **`insertImage`**`: MenuItem`
//   : A menu item to insert an [image](#schema-basic.Image).
//
// **`wrapBulletList`**`: MenuItem`
//   : A menu item to wrap the selection in a [bullet list](#schema-list.BulletList).
//
// **`wrapOrderedList`**`: MenuItem`
//   : A menu item to wrap the selection in an [ordered list](#schema-list.OrderedList).
//
// **`wrapBlockQuote`**`: MenuItem`
//   : A menu item to wrap the selection in a [block quote](#schema-basic.BlockQuote).
//
// **`makeParagraph`**`: MenuItem`
//   : A menu item to set the current textblock to be a normal
//     [paragraph](#schema-basic.Paragraph).
//
// **`makeCodeBlock`**`: MenuItem`
//   : A menu item to set the current textblock to be a
//     [code block](#schema-basic.CodeBlock).
//
// **`makeHead[N]`**`: MenuItem`
//   : Where _N_ is 1 to 6. Menu items to set the current textblock to
//     be a [heading](#schema-basic.Heading) of level _N_.
//
// **`insertHorizontalRule`**`: MenuItem`
//   : A menu item to insert a horizontal rule.
//
// The return value also contains some prefabricated menu elements and
// menus, that you can use instead of composing your own menu from
// scratch:
//
// **`insertMenu`**`: Dropdown`
//   : A dropdown containing the `insertImage` and
//     `insertHorizontalRule` items.
//
// **`typeMenu`**`: Dropdown`
//   : A dropdown containing the items for making the current
//     textblock a paragraph, code block, or heading.
//
// **`fullMenu`**`: [[MenuElement]]`
//   : An array of arrays of menu elements for use as the full menu
//     for, for example the [menu bar](https://github.com/prosemirror/prosemirror-menu#user-content-menubar).
export function buildMenuItems(schema) {
    let r = {}, type

    let cut = arr => arr.filter(x => x)

    if (type = schema.nodes.image)
        r.insertImage = insertImageItem(type)
    if (type = schema.nodes.bullet_list)
        r.wrapBulletList = wrapListItem(type, {
            title: "Wrap in bullet list",
            icon: icons.bulletList
        })
    if (type = schema.nodes.ordered_list)
        r.wrapOrderedList = wrapListItem(type, {
            title: "Wrap in ordered list",
            icon: icons.orderedList
        })
    if (type = schema.nodes.table) {
        r.insertTable = wrapTableItem(schema, {
            title: "Create table",
            icon: icons.table
        });

        r.tableDropDown = new Dropdown(buildTableMenu(), {icon: icons.table});
    }
    if (type = schema.nodes.blockquote)
        r.wrapBlockQuote = wrapItem(type, {
            title: "Wrap in block quote",
            icon: icons.blockquote
        })
    if (type = schema.nodes.paragraph)
        r.makeParagraph = blockTypeItem(type, {
            title: "Change to paragraph",
            label: "Paragraph"
        })
    if (type = schema.nodes.code_block)
        r.makeCodeBlock = blockTypeItem(type, {
            title: "Change to code block",
            label: "Code"
        })
    if (type = schema.nodes.heading)
        for (let i = 1; i <= 10; i++)
            r["makeHead" + i] = blockTypeItem(type, {
                title: "Change to heading " + i,
                label: "H" + i+' <small>('+Array(i+1).join("#")+')</small>',
                attrs: {level: i}
            })
    if (type = schema.nodes.horizontal_rule) {
        let hr = type
        r.insertHorizontalRule = new MenuItem({
            title: "Insert horizontal rule",
            label: "Horizontal rule",
            enable(state) {
                return canInsert(state, hr)
            },
            run(state, dispatch) {
                dispatch(state.tr.replaceSelectionWith(hr.create()))
            }
        })
    }

    if (type = schema.nodes.heading) {

        let options = blockTypeItem(type, {
            icon: icons.headline
        }).options;

        //r.headLineMenu = new Dropdown(cut([r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6]), options);
    }

    r.upload =

    r.insertMenu = new Dropdown(cut([r.insertImage, r.insertHorizontalRule]), {label: "Insert", icon: icons.image, class: 'ProseMirror-doprdown-right'});
    r.typeMenu = new Dropdown(cut([r.makeParagraph, r.makeCodeBlock, r.makeHead1 && new DropdownSubmenu(cut([
       r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6
     ]), {label: "Heading"})]), {icon: icons.text})

   // r.typeMenu = new Dropdown(cut([r.makeParagraph, r.makeCodeBlock]), {label: "Block Type", icon:icons.embed});

    r.inlineMenu = [cut([r.typeMenu, getItemBySchema(schema.marks.strong), getItemBySchema(schema.marks.em), getItemBySchema(schema.marks.code), getItemBySchema(schema.marks.link)])];

    //selectParentNodeItem -> don't know if we should add this one

    r.blockMenu = [cut([r.wrapBulletList, r.wrapOrderedList, r.wrapBlockQuote, joinUpItem, liftItem])];

    r.fullMenu = r.inlineMenu.concat(r.blockMenu, [[r.insertTable, r.tableDropDown, r.insertMenu]]);

    return r
}

let getItemBySchema = function (type) {

    if (!type) {
        return;
    }

    switch (type.name) {
        case 'strong':
            return markItem(type, {title: "Toggle strong style", icon: icons.strong});
        case 'em':
            return markItem(type, {title: "Toggle emphasis", icon: icons.em});
        case 'code':
            return markItem(type, {title: "Toggle code font", icon: icons.code});
        case 'link':
            return linkItem(type);
        case 'image':
            return insertImageItem(type);
        case 'bullet_list':
            return wrapListItem(type, {
                title: "Wrap in bullet list",
                icon: icons.bulletList
            });
        case 'ordered_list':
            return wrapListItem(type, {
                title: "Wrap in ordered list",
                icon: icons.orderedList
            });
        case 'table':
            return wrapTableItem(schema, {
                title: "Create table",
                icon: icons.table
            });
        case 'blockquote':
            return wrapItem(type, {
                title: "Wrap in block quote",
                icon: icons.blockquote
            });
        case 'paragraph':
            return blockTypeItem(type, {
                title: "Change to paragraph",
                label: "Paragraph"
            });
        case 'heading':
            let result = [];
            for (let i = 1; i <= 10; i++) {
                result["makeHead" + i] = blockTypeItem(type, {
                    title: "Change to heading " + i,
                    label: "H" + i+' ('+Array(i).join("#")+')',
                    attrs: {level: i}
                })
            }
            return result;
        case 'horizontal_rule':
            let hr = schema.nodes.horizontal_rule;
            return new MenuItem({
                title: "Insert horizontal rule",
                label: "Horizontal rule",
                enable(state) {
                    return canInsert(state, hr)
                },
                run(state, dispatch) {
                    dispatch(state.tr.replaceSelectionWith(hr.create()))
                }
            });
    }
};

export function wrapTableItem(schema, options) {
    let command = wrapIn(schema.nodes.table_header);
    let passedOptions = {
        run(state, dispatch, view) {
            openPrompt({
                title: "Insert table",
                fields: {
                    rowCount: new TextField({label: "Rows", required: true, value: 1}),
                    columnCount: new TextField({label: "Columns", value: 1})
                },
                callback(attrs) {
                    wrapIn(schema.nodes.table_header)(view.state, dispatch);

                    for (let i = 1; i < attrs.columnCount; i++) {
                        addColumnAfter(view.state, dispatch);
                    }

                    toggleHeaderRow(view.state, dispatch);
                    toggleHeaderRow(view.state, dispatch);

                    for (let i = 1; i < attrs.rowCount; i++) {
                        addRowAfter(view.state, dispatch);
                        //toggleHeaderRow();
                    }

                    view.focus()
                }
            })
        },
        enable(state) {
            return command(state)
        },
        select(state) {
            return command(state)
        }
    }
    for (let prop in options) passedOptions[prop] = options[prop]
    return new MenuItem(passedOptions)
}

export function buildMenu(options) {
    let menu = buildMenuItems(options.schema).fullMenu;
    return menuBar({
        content: menu,
        floating: false
    });
}

let buildTableMenu = function () {
    function item(label, cmd) {
        return new MenuItem({label, select: cmd, run: cmd})
    }

    return [
        item("Insert column before", addColumnBefore),
        item("Insert column after", addColumnAfter),
        item("Delete column", deleteColumn),
        item("Insert row before", addRowBefore),
        item("Insert row after", addRowAfter),
        item("Delete row", deleteRow),
        item("Delete table", deleteTable),
        //item("Toggle header column", toggleHeaderColumn),
        //item("Toggle header row", toggleHeaderRow),
        //item("Toggle header cells", toggleHeaderCell),
        //item("Make cell green", setCellAttr("background", "#dfd")),
        //item("Make cell not-green", setCellAttr("background", null))
    ];
};
