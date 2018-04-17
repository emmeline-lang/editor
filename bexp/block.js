/**
    block.js - Block-expressions library
    Copyright (C) 2017  TheAspiringHacker

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
;'use strict';

var Bexp = Bexp || {};

Bexp.Block = (function(window, document) {
    var Editor = function(elem, grammar) {
        this.BLOCK_HEIGHT = 25;
        this.SPACING = 5;
        this.TAB_WIDTH = 30;
        this.rootElement = elem;
        this.grammar = grammar;
        this.sidebar = document.createElement('div');
        this.rootElement.appendChild(this.sidebar);

        this.scriptArea = document.createElement('div');
        this.scriptArea.setAttribute('id', 'scripts');
        this.rootElement.appendChild(this.scriptArea);

        this.sprite =
            new Bexp.Svg.Sprite(document.createElementNS(Bexp.Svg.NS, 'svg'));
        this.scriptLayer =
            new Bexp.Svg.Sprite(document.createElementNS(Bexp.Svg.NS, 'svg'));
        this.scriptLayer.graphics.setAttributeNS(null, 'overflow', 'scroll');
        this.palette = new Bexp.Block.Palette(this, this.sidebar);
        this.dragLayer =
            new Bexp.Svg.Sprite(document.createElementNS(Bexp.Svg.NS, 'g'));
        this.sprite.appendChild(this.scriptLayer);
        this.sprite.appendChild(this.dragLayer);
        this.sprite.graphics.setAttributeNS(null, 'id', 'main-svg');
        this.sprite.graphics.setAttributeNS(null, 'width', '100%');
        this.sprite.graphics.setAttributeNS(null, 'height', '100%');

        this.scriptArea.appendChild(this.sprite.graphics);
        this.scripts = new Set();
        this.holes = new Set();
        this.dragged = null;
    };
    Editor.prototype.newBlock = function(nonterminal, production, children) {
        return new BlockExpr(this, nonterminal, production, children);
    };
    Editor.prototype.addScript = function(script, x, y) {
        script.transform.translation.x = x;
        script.transform.translation.y = y;
        this.scriptLayer.appendChild(script);
        script.render();
    };
    Editor.prototype.removeScript = function(block) {
        return this.scriptLayer.removeChild(block);
    };

    var Palette = function(owner, sidebar) {
        this.sprite =
            new Bexp.Svg.Sprite(document.createElementNS(Bexp.Svg.NS, 'svg'));
        this.editor = owner;
        this.sidebar = sidebar;
        this.sidebar.setAttribute('id', 'sidebar');
        this.rect = document.createElementNS(Bexp.Svg.NS, 'rect');
        this.rect.setAttributeNS(null, 'fill', '#e0e0e0')
        this.rect.setAttributeNS(null, 'width', '200');
        this.rect.setAttributeNS(null, 'height', '1000');
        this.sprite.graphics.setAttributeNS(null, 'overflow', 'scroll');
        this.sprite.graphics.setAttributeNS(null, 'height', '2000');
        this.sprite.graphics.setAttributeNS(null, 'width', '200');
        this.sprite.graphics.appendChild(this.rect);
        this.setNonterminal(this.editor.grammar.orderedNonterminals[0]);

        var ul = document.createElement('ul');
        ul.setAttribute('id', 'categories');
        for(const category of this.editor.grammar.orderedNonterminals) {
            var div = document.createElement('div');
            div.textContent = this.editor.grammar.nonterminals[category].name;
            div.setAttribute('class', 'category');
            var li = document.createElement('li');
            li.appendChild(div);
            ul.appendChild(li);
        }
        this.sidebar.appendChild(ul);
        this.editor.scriptLayer.appendChild(this.sprite);
    };

    Palette.prototype.setNonterminal = function(id) {
        this.selectedNonterminal = id;
    };

    var Hole = function(owner, index) {
        Bexp.Svg.Sprite.call(
            this, document.createElementNS(Bexp.Svg.NS, 'g')
        );
        this.rect = document.createElementNS(Bexp.Svg.NS, 'rect');
        this.rect.setAttributeNS(null, 'rx', '10');
        this.rect.setAttributeNS(null, 'ry', '10');
        this.rect.setAttributeNS(null, 'fill', '#ccb71e');
        this.rect.setAttributeNS(null, 'width', '25');
        this.rect.setAttributeNS(null, 'height', editor.BLOCK_HEIGHT);
        this.graphics.setAttributeNS(null, 'width', '25');
        this.graphics.setAttributeNS(null, 'height', editor.BLOCK_HEIGHT);
        this.graphics.appendChild(this.rect);
        this.owner = owner;
        this.index = index;
        this.cachedDragData = {
            pos: {x: 0, y: 0}, isDragged: false
        };
        this.owner.editor.holes.add(this);
    };
    Hole.prototype = Object.create(Bexp.Svg.Sprite.prototype);
    Hole.prototype.width = function() {
        return parseInt(this.rect.getAttributeNS(null, 'width'));
    };
    Hole.prototype.updateSVG = function() {
    };
    Hole.prototype.replaceWith = function(block) {
        this.owner.args[this.index] = block;
        block.index = this.index;
        this.owner.insertChild(block, this);
        this.owner.removeChild(this);
        this.owner.editor.holes.delete(this);
    };
    Hole.prototype.highlight = function() {
        this.rect.setAttributeNS(null, 'fill', 'white');
    };
    Hole.prototype.unhighlight = function() {
        this.rect.setAttributeNS(null, 'fill', '#ccb71e');
    };

    var Block = function(editor, nonterminal, production, args, index) {
        Bexp.Svg.Sprite.call(this, document.createElementNS(Bexp.Svg.NS, 'g'));
        this.editor = editor;
        this.nonterminal = nonterminal;
        this.production = production;
        this.symbols = editor.grammar
                             .nonterminals[nonterminal]
                             .productions[production].symbols;
        this.args = args || [];
        this.index = index || -1;
        this.rect = document.createElementNS(Bexp.Svg.NS, 'rect');
        this.rect.setAttributeNS(null, 'rx', '10');
        this.rect.setAttributeNS(null, 'ry', '10');
        this.rect.setAttributeNS(null, 'stroke', '#ccb71e');
        this.rect.setAttributeNS(null, 'stroke-width', '2');
        this.rect.setAttributeNS(null, 'height', editor.BLOCK_HEIGHT);
        this.rect.setAttributeNS(null, 'fill', '#fcdf05');
        this.graphics.append(this.rect);
        this.dropTarget = null;
        this.newlines = 0;

        (function() {
            var argIdx = 0;
            for(var i = 0; i < this.symbols.length; ++i) {
                switch(this.symbols[i].type) {
                case 'token':
                    var text = new Bexp.Svg.Text(this.symbols[i].text);
                    text.setFill('white');
                    this.appendChild(text);
                    break;
                case 'nonterminal':
                    if(argIdx < this.args.length) {
                        if(this.args[argIdx] == null) {
                            this.appendChild(new Hole(this, argIdx));
                        } else {
                            this.args[argIdx].index = argIdx;
                            this.appendChild(this.args[argIdx]);
                        }
                    } else {
                        this.args.push(null);
                        this.appendChild(new Hole(this, argIdx));
                    }
                    ++argIdx;
                    break;
                case 'newline':
                case 'tab':
                    break;
                default:
                    console.error(this.symbols[i].type + ' not a case');
                }
            }
        }).call(this);
        this.graphics.addEventListener('mousedown', this);
    };

    // Block extends Sprite
    Block.prototype = Object.create(Bexp.Svg.Sprite.prototype);
    Block.prototype.width = function() {
        return parseInt(this.rect.getAttributeNS(null, 'width'));
    };
    Block.prototype.height = function() {
        return (this.newlines + 1) * this.editor.BLOCK_HEIGHT;
    };
    Block.prototype.updateSVG = function() {
        var rowWidth = 0;
        var largestWidth = 0;
        var nonterminalIdx = 0;
        var oldWidth = this.width();
        var oldHeight = this.height();
        this.newlines = 0;
        var iter = this.childNodes[Symbol.iterator]();
        for(var i = 0; i < this.symbols.length; ++i) {
            // This if statement is put first and has a continue because
            // newline items in the grammar don't correspond with any graphics
            // widget / object / sprite, so next should not be called on iter!
            // If you think that this design is dirty and that I should make a
            // dummy newline object or something, please let me know in a PR!
            if(this.symbols[i].type == 'newline') {
                if(rowWidth > largestWidth) {
                    largestWidth = rowWidth;
                }
                rowWidth = 0;
                ++this.newlines;
                continue;
            }
            if(this.symbols[i].type == 'tab') {
                rowWidth += this.editor.TAB_WIDTH;
                continue;
            }
            var child = iter.next().value;
            var offset = this.newlines * this.editor.BLOCK_HEIGHT;
            if(this.symbols[i].type == 'token') {
                rowWidth += this.editor.SPACING;
                child.transform.translation = {x: rowWidth, y: offset + 17};
                rowWidth += child.width() + this.editor.SPACING;
            } else if(this.symbols[i].type == 'nonterminal') {
                child.transform.translation.x = rowWidth;
                child.transform.translation.y = offset;
                rowWidth += child.width();
                if(this.args[nonterminalIdx] == null) {
                } else {
                    if(this.args[nonterminalIdx].newlines > 0) {
                        this.newlines += this.args[nonterminalIdx].newlines;
                    }
                }
                ++nonterminalIdx;
            }
        }
        if(rowWidth > largestWidth) {
            largestWidth = rowWidth;
        }
        this.rect.setAttributeNS(null, 'width', largestWidth);
        this.rect.setAttributeNS(null, 'height', this.height());
        if(this.width() != oldWidth || this.height() != oldHeight) {
            if(this.parentNode != this.editor) {
                this.parentNode.render();
            }
        }
    };

    Block.prototype.clearArg = function(block) {
        this.args[block.index] = null;
        this.insertChild(new Hole(this, block.index), block);
        this.removeChild(block);
    };

    Block.prototype.handleEvent = function(event) {};

    var BlockExpr = function(editor, nonterminal, production, args, index) {
        Block.call(this, editor, nonterminal, production, args, index);
    };
    // BlockExpr extends Block
    BlockExpr.prototype = Object.create(Block.prototype);

    BlockExpr.prototype.mousedownEvent = function(event) {
        event.preventDefault();
        event.stopPropagation();
        document.addEventListener('mousemove', this);
        document.addEventListener('mouseup', this);
        var layer = this.parentNode;
        // A sprite's coordinates are relative to its parent's.
        // We need to make it relative to the scripting area.
        while(layer !== this.editor.sprite) {
            this.transform.translation.x += layer.transform.translation.x;
            this.transform.translation.y += layer.transform.translation.y;
            layer = layer.parentNode;
        }
        var oldParent = this.parentNode;
        if(this.parentNode === this.editor.scriptLayer) {
            this.parentNode.removeChild(this);
        } else {
            this.parentNode.clearArg(this);
        }
        this.editor.dragLayer.appendChild(this);
        this.editor.dragged = this;
        this.startDrag(event.pageX, event.pageY);
        this.render();
        oldParent.render();

        // Thanks NickyNouse on Scratch for the cache solution
        // https://scratch.mit.edu/discuss/topic/283813/?page=2#post-2928778
        for(hole of this.editor.holes) {
            hole.cachedDragData = {
                pos: {
                    x: hole.transform.translation.x,
                    y: hole.transform.translation.y
                },
                isDragged: false
            };
            var node = hole.owner;
            while(node !== this.editor.sprite) {
                if(node === this) {
                    hole.cachedDragData.isDragged = true;
                    break;
                }
                hole.cachedDragData.pos.x += node.transform.translation.x;
                hole.cachedDragData.pos.y += node.transform.translation.y;
                node = node.parentNode;
            }
        }
    };

    BlockExpr.prototype.mousemoveEvent = function(event) {
        this.updateDrag(event.pageX, event.pageY);
        var oldHole = this.dropTarget;
        var shortestDist = 20;
        this.dropTarget = null;
        for(hole of this.editor.holes) {
            if(!hole.cachedDragData.isDragged) {
                var dist = Bexp.Util.distance(hole.cachedDragData.pos,
                                              this.transform.translation);
                if(dist < shortestDist) {
                    shortestDist = dist;
                    this.dropTarget = hole;
                }
            }
        }
        if(oldHole !== this.dropTarget) {
            if(oldHole !== null) {
                oldHole.unhighlight();
                oldHole.render();
            }
            if(this.dropTarget !== null) {
                this.dropTarget.highlight();
                this.dropTarget.render();
            }
        }
        this.render();
    };

    BlockExpr.prototype.mouseupEvent = function(event) {
        document.removeEventListener('mousemove', this);
        document.removeEventListener('mouseup', this);
        this.editor.dragLayer.removeChild(this);
        if(this.dropTarget === null) {
            if(this.transform.translation.x
               < this.editor.palette.sprite.width()) {
                this.editor.scripts.delete(this);
            } else {
                this.editor.scriptLayer.appendChild(this);
                this.render();
            }
        } else {
            this.dropTarget.replaceWith(this);
            if(this.parentNode !== this.dropTarget.owner) {
                console.log('Assertion failed!');
            }
            this.parentNode.render();
                this.dropTarget = null;
        }
        this.editor.dragged = null;
        this.stopDrag();
    };

    BlockExpr.prototype.handleEvent = function(event) {
        switch(event.type) {
        case 'mousedown':
            this.mousedownEvent(event);
            break;
        case 'mousemove':
            this.mousemoveEvent(event);
            break;
        case 'mouseup':
            this.mouseupEvent(event);
            break;
        }
    };

    var BlockTemplate = function(editor, nonterminal, production, args, index) {
        Block.call(this, editor, nonterminal, production, args, index);
    };
    // BlockTemplate extends Block
    BlockTemplate.prototype = Object.create(Block.prototype);

    BlockTemplate.prototype.handleEvent = function(event) {
        switch(event.type) {
        case 'mousedown':
            var block = this.editor.newBlock(this.nonterminal, this.production);
            editor.addScript(block, this.transform.translation.x,
                             this.transform.translation.y);
            block.handleEvent(event);
            break;
        default:
            break;
        }
    };

    return {
        Editor: Editor,
        BlockExpr: BlockExpr,
        BlockTemplate: BlockTemplate,
        Palette: Palette,
        Translations: {}
    };
})(window, document);