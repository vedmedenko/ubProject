const Color = require('./Color')
const tools = require('./tools')

const UnderlineItems = ['none', 'single', 'double', 'doubleAccounting', 'singleAccounting']

class ReachText {
  static checkUnderline (val) {
    if (UnderlineItems.indexOf(val) < 0) {
      throw new Error(`Invalid underline value - "${val}"`)
    }
  }

  constructor () {
    this.xmlText = []
  }

  /**
   * Set text style
   * @param {Object} style
   */
  setStyle (style) {
    if (typeof style !== 'object') return
    this.currentStyle = style
  }

  getCurrentStyle () {
    return this.currentStyle
  }

  /**
   * @private
   */
  writeStyle () {
    if (!this.currentStyle) return
    this.xmlText.push('<rPr>')
    if (this.currentStyle.bold) {
      this.xmlText.push('<b />')
    }
    if (this.currentStyle.italic) {
      this.xmlText.push('<i />')
    }
    if (this.currentStyle.outline) {
      this.xmlText.push('<outline />')
    }
    if (this.currentStyle.strike) {
      this.xmlText.push('<strike />')
    }
    if (this.currentStyle.shadow) {
      this.xmlText.push('<shadow />')
    }
    if (typeof this.currentStyle.underline === 'string') {
      ReachText.checkUnderline(this.currentStyle.underline)
      this.xmlText.push(`<u val="${this.currentStyle.underline}" />`)
    }
    if (typeof this.currentStyle.fontSize === 'number') {
      this.xmlText.push(`<sz val="${this.currentStyle.fontSize}" />`)
    }
    if (typeof this.currentStyle.color === 'string') {
      this.xmlText.push(`<color rgb="${Color.parseRGB(this.currentStyle.color)}" />`)
    }
    if (typeof this.currentStyle.font === 'string') {
      this.xmlText.push(`<rFont val="${this.currentStyle.font}" />`)
    }
    this.xmlText.push('</rPr>')

    /*
    b (Bold) §3.8.2
    charset (Character Set) §3.4.1
    color (Data Bar Color) §3.3.1.14
    condense (Condense) §3.8.12
    extend (Extend) §3.8.16
    family (Font Family) §3.8.17
    i (Italic) §3.8.25
    outline (Outline) §3.4.2
    rFont (Font) §3.4.5
    scheme (Scheme) §3.8.36
    shadow (Shadow) §3.8.37
    strike (Strike Through) §3.4.10
    sz (Font Size) §3.4.11
    u (Underline) §3.4.13
    vertAlign
    */
  }

  /**
   *
   * @param {String} text
   * @param {Object} [style]
   * @param {Boolean} [style.bold]
   * @param {Boolean} [style.italic]
   * @param {Boolean} [style.outline]
   * @param {Boolean} [style.strike]
   * @param {Boolean} [style.shadow]
   * @param {String} [style.underline]
   * @param {String} [style.font]
   * @param {Number} [style.fontSize]
   * @param {String} [style.color]
   * @param {String} [style.underline]
   */
  addText (text, style) {
    this.setStyle(style)
    if (this.currentStyle) {
      this.xmlText.push('<r>')
      this.writeStyle()
      this.xmlText.push(`<t>${tools.escapeXML(text)}</t></r>`)
    } else {
      this.xmlText.push(`<t>${tools.escapeXML(text)}</t>`)
    }
  }

  getXML () {
    return this.xmlText.length === 0 ? undefined : this.xmlText.join('')
  }
}

function isStyleEqual (style, compare) {
  let ks = Object.keys(style)
  let kc = Object.keys(compare)
  if (ks.length !== kc.length) return false
  return ks.every(F => {
    if (kc.indexOf(F) < 0) return false
    return style[F] === compare[F]
  })
}

module.exports = ReachText
