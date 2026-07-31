import assert from 'node:assert/strict'
import { terminalTextToHtml } from './src/terminalHistoryRendering.ts'

assert.equal(
  terminalTextToHtml('A中B'),
  'A<span class="terminal-wide-char">中</span>B',
)

assert.equal(
  terminalTextToHtml('┌─┬─┐'),
  '┌─┬─┐',
)

assert.equal(
  terminalTextToHtml('<&>'),
  '&lt;&amp;&gt;',
)

assert.equal(
  terminalTextToHtml('👨‍💻'),
  '<span class="terminal-wide-char">👨‍💻</span>',
)

assert.equal(
  terminalTextToHtml('🇨🇳'),
  '<span class="terminal-wide-char">🇨🇳</span>',
)

assert.equal(
  terminalTextToHtml('한'),
  '<span class="terminal-wide-char">한</span>',
)

assert.deepEqual(
  [
    '│ 职业     │ 人数       │ 人均90d        │',
    '│ 企业主   │ 32万       │ 1104元         │',
    '│ 白领     │ 81万       │ 806元          │',
    '│ 开发者   │ 2178人     │ 821元          │',
  ].map(terminalTextToHtml),
  [
    '│ <span class="terminal-wide-char">职</span><span class="terminal-wide-char">业</span>     │ <span class="terminal-wide-char">人</span><span class="terminal-wide-char">数</span>       │ <span class="terminal-wide-char">人</span><span class="terminal-wide-char">均</span>90d        │',
    '│ <span class="terminal-wide-char">企</span><span class="terminal-wide-char">业</span><span class="terminal-wide-char">主</span>   │ 32<span class="terminal-wide-char">万</span>       │ 1104<span class="terminal-wide-char">元</span>         │',
    '│ <span class="terminal-wide-char">白</span><span class="terminal-wide-char">领</span>     │ 81<span class="terminal-wide-char">万</span>       │ 806<span class="terminal-wide-char">元</span>          │',
    '│ <span class="terminal-wide-char">开</span><span class="terminal-wide-char">发</span><span class="terminal-wide-char">者</span>   │ 2178<span class="terminal-wide-char">人</span>     │ 821<span class="terminal-wide-char">元</span>          │',
  ],
)

console.log('terminal history rendering tests passed')
