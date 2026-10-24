const API='https://revive-restore-shop-service.silver-tune-8563.chatgpt.site';
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('en-JM',{style:'currency',currency:'JMD'}).format(n/100);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const limit=p=>p?.preOrder?100:Math.min(p?.stock||0,100);
let catalog=null,cart=[],sending=false,attempt=null,requestOnly=false;
try{const a=JSON.parse(localStorage.getItem('revive-cart-v1')||'[]');if(Array.isArray(a))cart=a.filter(i=>i&&typeof i.id==='string'&&Number.isInteger(i.qty)&&i.qty>0&&i.qty<=100);}catch{}
function saveCart(){try{localStorage.setItem('revive-cart-v1',JSON.stringify(cart));}catch{}$('#cart-count').textContent=cart.reduce((a,i)=>a+i.qty,0);}
async function load(){
  $('#special-request').disabled=true;
  try{const r=await fetch(API+'/catalog',{cache:'no-store'});if(!r.ok)throw Error();catalog=await r.json();renderProducts();renderCart();$('#shop-status').textContent='';$('#special-request').disabled=false;}
  catch{$('#shop-status').textContent='The collection is temporarily unavailable. Please try again.';$('#products').innerHTML='<button class="button" id="retry-shop">Try again</button>';$('#retry-shop').onclick=load;}
}
function renderProducts(){
  const groups=[...new Set(catalog.products.map(p=>p.name))].map(name=>catalog.products.filter(p=>p.name===name));
  $('#products').innerHTML=groups.length?groups.map((variants,n)=>{const p=variants[0];return `<article class="product-card" data-product="${n}">${p.image?`<img src="${API+esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="600" height="600">`:''}<div><p class="product-status">${p.preOrder?'PRE-ORDER NOW':limit(p)?'AVAILABLE':'SOLD OUT'}</p><h3>${esc(p.name)}</h3><p class="description">${esc(p.description)}</p><label class="size-label" for="size-${n}">Choose size<select id="size-${n}" data-size>${variants.map(v=>`<option value="${esc(v.id)}">${esc(v.size)} — ${money(v.price)}</option>`).join('')}</select></label><div class="buy-row"><strong data-price>${money(p.price)}</strong><button class="button" data-add="${esc(p.id)}" ${limit(p)?'':'disabled'}>${limit(p)?p.preOrder?'Pre-order':'Add to cart':'Sold out'}</button></div></div></article>`;}).join(''):'<div class="shop-empty"><h3>Check back for the collection.</h3><p>You can still send us a special request below.</p></div>';
  document.querySelectorAll('[data-size]').forEach(select=>select.onchange=()=>{const p=catalog.products.find(p=>p.id===select.value),card=select.closest('article'),button=card.querySelector('[data-add]');card.querySelector('[data-price]').textContent=money(p.price);button.dataset.add=p.id;button.disabled=!limit(p);button.textContent=limit(p)?p.preOrder?'Pre-order':'Add to cart':'Sold out';card.querySelector('.product-status').textContent=p.preOrder?'PRE-ORDER NOW':limit(p)?'AVAILABLE':'SOLD OUT';});
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>previewProduct(b.dataset.add));
}
function previewProduct(id){
  const p=catalog.products.find(p=>p.id===id);if(!p)return;
  let dialog=$('#product-preview');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='product-preview';dialog.className='shop-dialog';dialog.setAttribute('aria-labelledby','preview-title');document.body.append(dialog);}
  const variants=catalog.products.filter(v=>v.name===p.name);
  dialog.innerHTML=`<div class="dialog-head"><h2 id="preview-title">${esc(p.name)}</h2><button class="close-dialog" id="close-preview" aria-label="Close product preview">×</button></div>${p.image?`<img src="${API+esc(p.image)}" alt="${esc(p.name)}" style="max-width:100%;max-height:260px;object-fit:contain">`:''}<p class="product-status">${p.preOrder?'PRE-ORDER PREVIEW':'PRODUCT PREVIEW'}</p><p style="line-height:1.8" id="preview-description">${esc(p.description)}</p><label class="size-label" for="preview-size">Choose size</label><select id="preview-size">${variants.map(v=>`<option value="${esc(v.id)}" ${v.id===id?'selected':''}>${esc(v.size)} — ${money(v.price)}</option>`).join('')}</select><div class="summary-row total"><span>Price (JMD)</span><strong id="preview-price">${money(p.price)}</strong></div><p class="checkout-note">Pre-order availability, dispatch date and delivery charges will be confirmed before payment.</p><p class="error" role="alert" id="preview-error"></p><button class="button" id="preview-add">Add to cart</button>`;
  const refresh=()=>{const selected=catalog.products.find(v=>v.id===$('#preview-size').value);$('#preview-price').textContent=money(selected.price);$('#preview-description').textContent=selected.description;$('#preview-add').disabled=!limit(selected);$('#preview-add').textContent=limit(selected)?'Add to cart':'Sold out';$('#preview-error').textContent='';};
  $('#preview-size').onchange=refresh;$('#close-preview').onclick=()=>dialog.close();
  $('#preview-add').onclick=()=>{const selected=catalog.products.find(v=>v.id===$('#preview-size').value),i=cart.find(i=>i.id===selected.id);if((i?.qty||0)>=limit(selected)){$('#preview-error').textContent='Maximum quantity reached. Please send a special request for a larger order.';return;}if(i)i.qty++;else cart.push({id:selected.id,qty:1});attempt=null;renderCart();$('#shop-status').textContent=selected.name+' ('+selected.size+') added to your cart.';dialog.close();$('#cart-dialog').showModal();};
  refresh();dialog.showModal();
}
function renderCart(){
  saveCart();if(!catalog)return;
  const lines=cart.map(i=>({i,p:catalog.products.find(p=>p.id===i.id)}));
  $('#cart-items').innerHTML=lines.length?lines.map(({i,p})=>`<div class="cart-line"><div><strong>${p?esc(p.name):'Unavailable product'}</strong><p>${p?esc(p.size)+(p.preOrder?' · Pre-order':''):'Please remove this item.'}</p>${p&&i.qty>limit(p)?'<p class="error">Please reduce the quantity.</p>':''}</div><label>Quantity<input aria-label="Quantity for ${p?esc(p.name+' '+p.size):'unavailable item'}" type="number" min="1" max="${p?limit(p):1}" step="1" value="${i.qty}" data-qty="${i.id}"></label><strong>${p?money(p.price*i.qty):'—'}</strong><button class="text-button" data-remove="${i.id}">Remove</button></div>`).join(''):'<p>Your cart is empty. Choose your favourites from the collection.</p>';
  document.querySelectorAll('[data-qty]').forEach(input=>input.onchange=()=>{const i=cart.find(i=>i.id===input.dataset.qty),p=catalog.products.find(p=>p.id===i.id),qty=Number(input.value);if(!Number.isInteger(qty)||qty<1){input.value=i.qty;return;}i.qty=Math.min(limit(p)||1,qty);attempt=null;renderCart();});
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.id!==b.dataset.remove);attempt=null;renderCart();});
  const subtotal=lines.reduce((n,{i,p})=>n+(p?p.price*i.qty:0),0);$('#cart-subtotal').textContent=money(subtotal);$('#checkout-subtotal').textContent=requestOnly?'Quote required':money(subtotal);$('#checkout-start').disabled=!lines.length||lines.some(({i,p})=>!p||limit(p)<i.qty);
  const selected=$('#delivery').value;
  $('#delivery').innerHTML=catalog.settings.delivery.length?'<option value="">Choose delivery area or service</option>'+catalog.settings.delivery.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}${d.fee?' — '+money(d.fee):d.pending?'':' — '+money(d.fee)}</option>`).join(''):'<option value="confirm">Delivery availability and fee to be confirmed</option>';
  if(catalog.settings.delivery.some(d=>d.id===selected))$('#delivery').value=selected;
  $('#delivery-note').textContent=catalog.settings.deliveryNote;updateTotal();
}
function updateTotal(){if(!catalog)return;const subtotal=requestOnly?0:cart.reduce((n,i)=>n+(catalog.products.find(p=>p.id===i.id)?.price||0)*i.qty,0),d=catalog.settings.delivery.find(d=>d.id===$('#delivery').value);$('#checkout-total').textContent=requestOnly?'Price quote pending':money(subtotal+(d?.fee||0))+(!d||d.pending?(d?.fee?' estimated':' + delivery quote'):'');$('#delivery-charge').textContent=d&&d.fee?money(d.fee)+(d.pending?' estimated':''):d&&!d.pending?money(d.fee):'To be quoted';}
function checkout(special=false){if(!catalog)return;requestOnly=special;attempt=null;$('#cart-dialog').close();$('#checkout-form').hidden=false;$('#confirmation').hidden=true;$('#checkout-title').textContent=special?'Your special request':'Pre-order checkout';$('#notes-label').textContent=special?'Requested oil, bottle size and quantity':'Order notes or special requests (optional)';$('#order-notes').required=special;$('#place-order').textContent=special?'Send special request':'Send pre-order request';$('#checkout-error').textContent='';$('#checkout-dialog').showModal();renderCart();}
$('#open-cart').onclick=()=>{$('#cart-dialog').showModal();renderCart();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!sending)b.closest('dialog').close();});
$('#checkout-start').onclick=()=>checkout();$('#special-request').onclick=()=>checkout(true);
$('#delivery').onchange=()=>{attempt=null;updateTotal();};$('#checkout-form').addEventListener('input',()=>{if(!sending)attempt=null;});
$('#payment').onchange=()=>{$('#bank-note').hidden=$('#payment').value!=='bank';$('#bank-note').textContent=catalog?.settings.bankInstructions||'Bank details will be provided after confirmation.';};
$('#checkout-dialog').addEventListener('cancel',e=>{if(sending)e.preventDefault();});
$('#checkout-form').onsubmit=async e=>{
  e.preventDefault();if(sending||!catalog||(!requestOnly&&!cart.length))return;
  const f=new FormData(e.currentTarget),d=catalog.settings.delivery.find(d=>d.id===f.get('delivery'));
  const draft={name:f.get('name'),phone:f.get('phone'),email:f.get('email'),address:f.get('address'),parish:f.get('parish'),notes:f.get('notes'),website:f.get('website'),payment:f.get('payment'),deliveryId:d?.id||'',deliveryFee:d?.fee||0,requestOnly,items:requestOnly?[]:cart.map(i=>({id:i.id,qty:i.qty,price:catalog.products.find(p=>p.id===i.id)?.price}))};
  if(!attempt)attempt={id:crypto.randomUUID(),...draft};sending=true;$('#checkout-fields').disabled=true;$('#place-order').textContent='Sending request…';$('#checkout-error').textContent='';
  try{const r=await fetch(API+'/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(attempt)}),result=await r.json();if(!r.ok){if(r.status===409){await load();attempt=null;}throw Error(result.error||'Unable to submit your request.');}
    $('#confirmation').hidden=false;$('#confirmation').innerHTML=`<h2>Thank you, ${esc(draft.name)}.</h2><p>Your ${draft.requestOnly?'special request':'pre-order request'} has been received.</p><p><strong>Reference: ${esc(result.id.slice(0,8).toUpperCase())}</strong></p><p>${draft.requestOnly?'We’ll confirm availability and send a price quote.':money(result.total)+(result.deliveryPending?' estimated — final delivery charges to be confirmed':'')}</p><p>We will contact you to confirm availability, the dispatch date, delivery and payment arrangements.</p><p>${draft.payment==='bank'?esc(result.bankInstructions||'Bank details will be provided after confirmation.'):'Cash payment is subject to confirmation for your chosen delivery service.'}</p><p>Please wait for confirmation before transferring money. No payment has been taken.</p><button type="button" class="button" id="finish-checkout">Continue browsing</button>`;
    $('#checkout-form').hidden=true;$('#finish-checkout').onclick=()=>{$('#checkout-dialog').close();$('#confirmation').hidden=true;$('#checkout-form').hidden=false;$('#checkout-form').reset();$('#bank-note').hidden=true;};
    if(!draft.requestOnly)cart=[];attempt=null;saveCart();await load();
  }catch(err){$('#checkout-error').textContent=err.message||'Connection lost. Retry this same request; it will not be submitted twice.';}
  finally{sending=false;$('#checkout-fields').disabled=false;$('#place-order').textContent=requestOnly?'Send special request':'Send pre-order request';}
};
saveCart();load();
