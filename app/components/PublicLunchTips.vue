<script setup lang="ts">
import { Apple, ArrowUpRight, Box, CircleCheck, Cookie, CupSoda, Recycle, Sandwich, ShieldCheck, Wallet } from '@lucide/vue'

const swaps = [
  { title: 'Snack packets', icon: Cookie, colour: 'peach', swap: 'One larger pack, little reusable tubs.', detail: 'Portion crackers or other dry snacks into a clean, dry snack box. Compare packaging per serve: a multipack can still contain lots of individual wrappers.' },
  { title: 'Cling wrap', icon: Sandwich, colour: 'mint', swap: 'Let the lunchbox do the wrapping.', detail: 'Put sandwiches or rolls straight into a fitted sandwich box or bento compartment. A washable food wrap is another option; follow its care and food-use instructions.' },
  { title: 'Yoghurt pouches', icon: CupSoda, colour: 'blue', swap: 'A small pot and a reusable spoon.', detail: 'Spoon yoghurt from a larger tub into a leakproof reusable pot. Keep it chilled in an insulated bag with an ice brick. Check the lid before packing.' },
  { title: 'Individually wrapped snacks', icon: Apple, colour: 'yellow', swap: 'Try a wrapper-free lunchbox favourite.', detail: 'Pack loose whole fruit, vegetable sticks or a homemade muffin in reusable compartments. Choose age-appropriate portions and follow your school\'s allergy rules.' },
]

const products = [
  { title: 'Nude Food Movers sandwich box', retailer: 'BIG W', price: 'A$6', unit: 'each', icon: Sandwich, material: 'Reusable plastic', detail: 'A hinged lid stays attached. The retailer lists top-rack dishwasher care. Reusable plastic can replace single-use wrap, but is not plastic-free.', url: 'https://www.bigw.com.au/product/nude-food-movers-sandwich-box-assorted-/p/82329' },
  { title: 'Stainless steel meal containers', retailer: 'Kmart', price: 'A$15', unit: '2-pack', icon: Box, material: 'Steel bodies, silicone lids', detail: 'The retailer lists food-grade stainless steel and top-shelf dishwasher care. Not for a microwave, oven or stovetop. Check the size fits your lunch bag.', url: 'https://www.kmart.com.au/product/2-pack-stainless-steel-meal-containers-43728725/' },
]
</script>

<template>
  <section id="lunchbox-tips" class="lunchbox-tips" aria-labelledby="lunchbox-tips-heading">
    <div class="section-title-row">
      <div><div class="section-kicker">SMALL SWAPS, EVERY SCHOOL DAY</div><h2 id="lunchbox-tips-heading">Lunchbox tips</h2></div>
      <span class="heading-icon blue"><Sandwich :size="21" aria-hidden="true" /></span>
    </div>
    <p class="tips-intro">Less wrapping. More reusing. Start with the containers you already have, and try one small swap at a time.</p>

    <div class="tips-swap-grid">
      <article v-for="tip in swaps" :key="tip.title" class="tip-swap">
        <span class="heading-icon" :class="tip.colour"><component :is="tip.icon" :size="21" aria-hidden="true" /></span>
        <h3>{{ tip.title }}</h3><strong>{{ tip.swap }}</strong><p>{{ tip.detail }}</p>
      </article>
    </div>

    <div class="tips-packing">
      <div><div class="section-kicker">THE NIGHT-BEFORE ROUTINE</div><h3>From pantry to lunchbox</h3></div>
      <ol>
        <li><strong>Choose less packaging.</strong><span>Look for loose food or a larger pack with less wrapping per serve. Keep the original ingredient, allergen and use-by information.</span></li>
        <li><strong>Portion, seal, label.</strong><span>Use clean food-safe containers with lids your child can open. Put wet and dry foods in separate compartments.</span></li>
        <li><strong>Chill, pack, repeat.</strong><span>Refrigerate perishable food until leaving. Add an ice brick, then bring containers home to wash and dry for next time.</span></li>
      </ol>
      <p class="tips-counting"><Recycle :size="19" aria-hidden="true" /><span><strong>Count plastic actually avoided.</strong> Unwrapping a packaged snack at home moves the rubbish; it does not remove the packaging. Log a saved item when a reusable or unpackaged option replaces it.</span></p>
    </div>

    <div class="tips-shopping-heading"><h3>Budget-friendly replacements</h3><p>Buy only what you need. A sturdy lid, an easy-to-clean shape and a good fit matter more than a matching set.</p></div>
    <div class="tips-shopping-grid">
      <article class="tip-product tip-product-reuse">
        <span class="heading-icon mint"><Wallet :size="21" aria-hidden="true" /></span>
        <div class="tip-price"><strong>A$0</strong><span>no new purchase</span></div>
        <h4>Start in your kitchen</h4><p>Keep using an intact, food-safe reusable lunchbox or snack tub you already own, including reusable plastic. Replace cracked or damaged containers.</p>
        <span class="tip-product-foot"><CircleCheck :size="16" aria-hidden="true" /> No shopping needed</span>
      </article>
      <article v-for="product in products" :key="product.title" class="tip-product">
        <span class="heading-icon blue"><component :is="product.icon" :size="21" aria-hidden="true" /></span>
        <div class="tip-price"><strong>{{ product.price }}</strong><span>{{ product.unit }}</span></div>
        <h4>{{ product.title }}</h4><span class="tip-material">{{ product.material }}</span><p>{{ product.detail }}</p>
        <a :href="product.url" target="_blank" rel="noopener noreferrer" :aria-label="`View ${product.title} at ${product.retailer} (opens in a new tab)`">View at {{ product.retailer }} <ArrowUpRight :size="17" aria-hidden="true" /></a>
      </article>
    </div>
    <p class="tips-price-note">Indicative Australian prices shown on the linked retailer pages when checked on 23 October 2026. Prices, stock and delivery costs can change. These are options to compare, not independently tested recommendations or a school endorsement.</p>

    <div class="tips-safety"><ShieldCheck :size="23" aria-hidden="true" /><div><h3>Keep it safe, too</h3><p>Wash and dry lunchboxes daily. Keep yoghurt, cheese, meat and other perishable food cold with an insulated bag and ice brick. Follow your school's allergy rules and the container's care instructions.</p><a href="https://www.foodauthority.nsw.gov.au/consumer/food-risk-you/kids-lunch-boxes" target="_blank" rel="noopener noreferrer">Lunchbox safety from NSW Food Authority <ArrowUpRight :size="15" aria-hidden="true" /><span class="tips-sr-only"> (opens in a new tab)</span></a></div></div>
  </section>
</template>

<style scoped>
.lunchbox-tips{margin-top:34px;scroll-margin-top:85px;color:#314d40;letter-spacing:0}
.lunchbox-tips .section-kicker{letter-spacing:0}
.tips-intro{font-size:13px;line-height:1.6;color:#65796d;margin-bottom:20px;max-width:650px}
.tips-swap-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.tip-swap{min-width:0;border:1px solid #e0e8e1;border-radius:7px;padding:19px;background:#fff}
.tip-swap .yellow{background:#fff4d8;color:#9c7620}
.tip-swap h3{font-size:16px;line-height:1.3;margin:13px 0 7px;color:#233f33}
.tip-swap strong{display:block;font-size:12px;line-height:1.5;margin-bottom:7px}
.tip-swap p,.tip-product p{font-size:12px;line-height:1.65;margin-bottom:0;color:#63766b}
.tips-packing{margin-top:25px;padding:22px 0;border-top:1px solid #dae5de;border-bottom:1px solid #dae5de}
.tips-packing h3,.tips-shopping-heading h3{font-size:18px;margin:0 0 14px;color:#233f33}
.tips-packing ol{list-style:none;counter-reset:packing;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin:0;padding:0}
.tips-packing li{counter-increment:packing;position:relative;min-width:0;padding-left:32px;font-size:12px;line-height:1.6}
.tips-packing li::before{content:counter(packing);position:absolute;left:0;top:1px;width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:#e1eee4;color:#286747;font-size:11px;font-weight:800}
.tips-packing li strong,.tips-packing li span{display:block}.tips-packing li span{margin-top:4px;color:#63766b}
.tips-counting{display:flex;align-items:flex-start;gap:10px;margin:20px 0 0;padding:13px 15px;background:#edf4f7;border-left:3px solid #6196a7;color:#3e6071;font-size:12px;line-height:1.6}
.tips-counting svg,.tips-safety>svg{flex:none;margin-top:2px}
.tips-shopping-heading{margin-top:24px}.tips-shopping-heading h3{margin-bottom:5px}.tips-shopping-heading p{font-size:12px;line-height:1.6;color:#63766b}
.tips-shopping-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.tip-product{position:relative;display:flex;flex-direction:column;align-items:flex-start;min-width:0;border:1px solid #e0e8e1;border-radius:7px;padding:19px;background:#fff}
.tip-product-reuse{background:#edf5ec}.tip-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px 8px;margin-top:15px}.tip-price strong{font-size:24px;font-family:inherit;color:#234b39}.tip-price span{font-size:11px;color:#63766b}
.tip-product h4{font-size:14px;line-height:1.4;margin:10px 0 7px}.tip-material{font-size:10px;font-weight:800;color:#386b80;margin-bottom:8px}.tip-product p{margin-bottom:16px}
.tip-product a,.tip-product-foot{display:inline-flex;align-items:center;gap:6px;min-height:44px;margin-top:auto;font-size:12px;font-weight:800;color:#286747;text-underline-offset:4px}
.tip-product a svg{flex:none}.tip-product-foot{font-weight:600}.tips-price-note{font-size:10px;line-height:1.7;color:#63766b;margin:12px 0 0}
.tips-safety{display:flex;align-items:flex-start;gap:13px;margin-top:22px;padding:18px 0;color:#436e80}.tips-safety h3{font-size:15px;margin:0 0 6px}.tips-safety p{font-size:12px;line-height:1.6;margin-bottom:4px;color:#63766b}.tips-safety a{display:inline-flex;align-items:center;gap:5px;min-height:44px;color:#386b80;font-size:11px;line-height:1.5;text-underline-offset:4px}.tips-safety a svg{flex:none}
.lunchbox-tips a:focus-visible{outline:2px solid #286747;outline-offset:4px;border-radius:2px}.tips-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:1200px){.tips-swap-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:850px){.lunchbox-tips{scroll-margin-top:80px}}
@media(max-width:700px){.tips-shopping-grid{grid-template-columns:1fr}.tips-packing ol{grid-template-columns:1fr;gap:16px}.tip-product{padding:17px}.tip-product .heading-icon{position:absolute;right:17px;top:17px}.tip-price{margin-top:0;padding-right:45px}.tip-product h4{margin-top:12px}}
@media(max-width:480px){.tips-swap-grid{grid-template-columns:1fr;gap:10px}.tip-swap{padding:17px 17px 17px 65px;position:relative}.tip-swap>.heading-icon{position:absolute;left:17px;top:17px}.tip-swap h3{margin-top:0}.tips-counting{padding:12px 10px}.tips-safety{gap:9px}.tips-safety>svg{width:19px}.tips-safety a{flex-wrap:wrap}}
</style>
