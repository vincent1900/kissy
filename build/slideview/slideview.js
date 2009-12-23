/*
Copyright (c) 2009, Kissy UI Library. All rights reserved.
MIT Licensed.
http://kissy.googlecode.com/

Date: 2009-12-23 17:51:09
Revision: 338
*/
/**
 * SlideView
 * @module      slideview
 * @creator     玉伯<lifesinger@gmail.com>
 * @depends     kissy-core, yahoo-dom-event
 */
KISSY.add("slideview", function(S) {

    var Y = YAHOO.util, Dom = Y.Dom, Event = Y.Event, Lang = YAHOO.lang,
        BLOCK = "block", NONE = "none",
        OPACITY = "opacity", Z_INDEX = "z-index",
        RELATIVE = "relative", ABSOLUTE = "absolute",
        CLS_PREFIX = "ks-slideview-",
        TYPES = { NONE: "none", SCROLLX: "scrollx", SCROLLY: "scrolly", FADE: "fade" },

        defaultConfig = {
            // mackup 是固定的，详见 demo. nav 可以自动生成
            navCls: CLS_PREFIX + "nav",
            contentCls: CLS_PREFIX + "content",

            triggerType: "mouse", // or "click" 触发类型
            triggerDelay: 0.1, // 触发延迟

            autoPlay: true,
            autoPlayInterval: 5, // 自动播放间隔时间
            pauseOnMouseOver: true,  // triggerType 为 mouse 时，鼠标悬停在 slide 上是否暂停自动播放

            effectType: TYPES.NONE, // "scrollx", "scrolly", "fade"
            animDuration: .5, // 开启切换效果时，切换的时长
            animEasing: Y.Easing && Y.Easing.easeNone, // easing method

            activeIndex: 0, // 为了避免闪烁，mackup的默认激活项，应该与此 index 一致
            activeTriggerCls: CLS_PREFIX + "trigger-active",

            panelSize: [] // 卡盘 panel 的宽高。一般不需要设定此值
            // 只有当无法正确获取高宽时，才需要设定
            // 比如父级元素 display: none 时，无法获取到 offsetWidth, offsetHeight
        },

        // 效果集
        effects = {

            // 最朴素的显示/隐藏效果
            none: function(fromPanel, toPanel) {
                fromPanel.style.display = NONE;
                toPanel.style.display = BLOCK;
            },

            // 淡隐淡现效果
            fade: function(fromPanel, toPanel) {
                var self = this, cfg = self.config;

                // 设置 z-index
                Dom.setStyle(toPanel, Z_INDEX, 1);
                Dom.setStyle(fromPanel, Z_INDEX, 9);

                // 首先显示下一张
                Dom.setStyle(toPanel, OPACITY, 1);

                // 淡隐效果
                self.anim = new Y.Anim(fromPanel, { opacity: { to: 0 } }, cfg.animDuration, cfg.animEasing);
                self.anim.onComplete.subscribe(function() {
                    self.anim = null; // free
                    
                    // 让链接正确
                    Dom.setStyle(toPanel, Z_INDEX, 9);
                    Dom.setStyle(fromPanel, Z_INDEX, 1);
                });
                self.anim.animate();
            },

            // 水平/垂直滚动效果
            scroll: function(fromPanel, toPanel, index, isX) {
                var self = this, cfg = self.config,
                    diff = self.panelSize[isX ? 0 : 1] * index,
                    attributes = {};

                attributes[isX ? "left" : "top"] = { to: -diff };
                self.anim = new Y.Anim(self.content, attributes, cfg.animDuration, cfg.animEasing);
                self.anim.onComplete.subscribe(function() {
                    self.anim = null; // free
                });
                self.anim.animate();
            }
        };
    effects[TYPES.SCROLLX] = effects[TYPES.SCROLLY] = effects.scroll;

    /**
     * SlideView
     * @constructor
     */
    function SlideView(container, config) {
        // factory or constructor
        if (!(this instanceof arguments.callee)) {
            return new arguments.callee(container, config);
        }

        /**
         * 触发
         * @type HTMLElement
         */
        this.container = Dom.get(container);

        // 根据效果类型，调整默认配置
        if (config.effectType === TYPES.SCROLLX || config.effectType === TYPES.SCROLLY) {
            defaultConfig.animDuration = .8;
            defaultConfig.animEasing = Y.Easing && Y.Easing.easeOutStrong;
        }

        /**
         * 配置参数
         * @type Object
         */
        this.config = S.merge(defaultConfig, config || {});

        /**
         * triggers
         * @type Array of HTMLElement
         */
        this.triggers = [];

        /**
         * panels
         * @type Array of HTMLElement
         */
        this.panels = [];

        /**
         * nav
         * @type HTMLElement
         */

        /**
         * content
         * @type HTMLElement
         */

        /**
         * panelSize
         * @type Array  [x, y]
         */
        this.panelSize = [];

        /**
         * 当前激活的 index
         * @type number
         */
        this.activeIndex = this.config.activeIndex;

        /**
         * anim
         * @type YAHOO.util.Anim
         */

        /**
         * 自动播放是否暂停
         */
        this.autoPlayIsPaused = false;

        // init
        this._init();
    }

    S.augment(SlideView, S.Triggerable);

    S.mix(SlideView.prototype, {

        /**
         * 初始化
         * @protected
         */
        _init: function() {
            var self = this;

            self._parseMackup();
            self._initStyle();
            self._initTriggers();

            if (self.config.autoPlay) {
                self._initAutoPlay();
            }
        },

        /**
         * 解析 mackup, 获取 triggers 和 panels
         * @protected
         */
        _parseMackup: function() {
            var self = this,
                container = self.container, cfg = self.config,
                nav, content, triggers = [], panels = [], n, m, i, len,
                getElementsByClassName = Dom.getElementsByClassName;

            content = getElementsByClassName(cfg.contentCls, "*", container)[0];
            panels = Dom.getChildren(content);
            nav = getElementsByClassName(cfg.navCls, "*", container)[0] || self._generateNavMackup(panels.length);
            triggers = Dom.getChildren(nav);

            // 让 triggers 和 panels 数量匹配
            n = triggers.length;
            m = panels.length;
            for (i = 0,len = n > m ? m : n; i < len; i++) {
                self.triggers.push(triggers[i]);
                self.panels.push(panels[i]);
            }

            self.nav = nav;
            self.content = content;
        },

        /**
         * 自动生成 nav 的 mackup
         * @protected
         */
        _generateNavMackup: function(len) {
            var self = this, cfg = self.config,
                ul = document.createElement("UL"), li, i;

            ul.className = cfg.navCls;
            for (i = 0; i < len; i++) {
                li = document.createElement("LI");
                if (i === self.activeIndex) {
                    li.className = cfg.activeTriggerCls;
                }
                li.innerHTML = i + 1;
                ul.appendChild(li);
            }

            self.container.appendChild(ul);
            return ul;
        },

        /**
         * 根据 effectType，调整初始状态
         */
        _initStyle: function() {
            var self = this,
                cfg = self.config, type = cfg.effectType,
                panels = self.panels,
                i, len = self.triggers.length,
                activeIndex = self.activeIndex;

            // 1. 获取高宽
            self.panelSize[0] = cfg.panelSize[0] || panels[0].offsetWidth;
            self.panelSize[1] = cfg.panelSize[0] || panels[0].offsetHeight; // 所有 panel 的尺寸应该相同
            // 最好指定第一个 panel 的 width 和 height，因为 Safari 下，图片未加载时，读取的 offsetHeight 等值会不对

            // 2. 初始化 panels 样式
            if (type === TYPES.NONE) {
                // 默认情况，只显示 activePanel
                for (i = 0; i < len; i++) {
                    panels[i].style.display = i === activeIndex ? BLOCK : NONE;
                }

            } else { // type = scrollx, scrolly, fade

                // 这些特效需要将 panels 都显示出来
                for (i = 0; i < len; i++) {
                    panels[i].style.display = BLOCK;
                }

                // 设置定位信息，为滚动效果做铺垫
                if (type === TYPES.SCROLLX || type === TYPES.SCROLLY) {
                    self.container.style.position = RELATIVE;
                    self.content.style.position = ABSOLUTE;

                    // 水平排列
                    if (type === TYPES.SCROLLX) {
                        Dom.setStyle(panels, "float", "left");

                        // 设置最大宽度，以保证有空间让 panels 水平排布
                        this.content.style.width = self.panelSize[0] * len + "px";
                    }
                }

                // 初始化透明
                if (type === TYPES.FADE) {
                    for (i = 0; i < len; i++) {
                        Dom.setStyle(panels[i], OPACITY, i === self.activeIndex ? 1 : 0);
                        panels[i].style.position = ABSOLUTE;
                        panels[i].style.zIndex = i === self.activeIndex ? 9 : 1;
                    }
                }
            }

            // 3. 对应的 CSS 里，container 需要设置高宽和 overflow: hidden
            //    nav 的 cls 由 CSS 指定
        },

        /**
         * 设置自动播放
         */
        _initAutoPlay: function() {
            var self = this, cfg = self.config, max = self.panels.length - 1;

            // 鼠标悬停，停止自动播放
            if (cfg.pauseOnMouseOver) {
                Event.on([self.content, self.nav], "mouseenter", function() {
                    self.autoPlayIsPaused = true;
                });

                Event.on([self.content, self.nav], "mouseleave", function() {
                    self.autoPlayIsPaused = false;
                });
            }

            // 设置自动播放
            if (cfg.autoPlay) {
                self.autoPlayTimer = Lang.later(cfg.autoPlayInterval * 1000, this, function() {
                    if (self.autoPlayIsPaused) return;
                    self.switchTo(self.activeIndex < max ? self.activeIndex + 1 : 0);
                }, null, true);
            }
        },

        /**
         * 切换内容
         * @protected
         */
        _switchContent: function(fromPanel, toPanel, index) {
            var self = this, cfg = self.config, type = cfg.effectType;


            // fire effect fn
            effects[type].call(this, fromPanel, toPanel, index, type === TYPES.SCROLLX);
        }
    });

    S.SlideView = SlideView;
});

/**
 * TODO:
 *   - onSwitch 的触发有必要放在动画结束后吗？
 */
