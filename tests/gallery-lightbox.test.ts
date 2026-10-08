import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { bindGalleryLightbox, createGalleryLightboxOptions } from '../src/utils/galleryLightbox';

function fixture(count = 2) {
 const window = new Window();
 window.document.body.innerHTML = `<article data-gallery-page>${Array.from({length:count}, (_,i)=>`<a href="https://example.com/${i}.jpg" data-gallery-image data-width="1000" data-height="700" data-alt="Image ${i}" data-caption="Caption ${i}"><img></a>`).join('')}</article>`;
 return {window, root: window.document.querySelector('article')! as unknown as HTMLElement};
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('only ordinary image clicks request the module and open the selected slide', async () => {
 const {window, root} = fixture(); let loads = 0; let selected = -1;
 bindGalleryLightbox(root, {load: async()=>{loads++; return {open:(_items,index)=>{selected=index; return ()=>{};}};}, navigate:()=>{}, reducedMotion:()=>false});
 expect(loads).toBe(0);
 root.querySelectorAll('a')[1].dispatchEvent(new window.MouseEvent('click', {bubbles:true, cancelable:true, ctrlKey:true}) as unknown as MouseEvent);
 expect(loads).toBe(0);
 root.querySelectorAll('a')[1].dispatchEvent(new window.MouseEvent('click', {bubbles:true,cancelable:true}) as unknown as MouseEvent);
 await tick(); expect(loads).toBe(1); expect(selected).toBe(1);
});
test('module failure follows the original full image link', async()=>{
 const {window,root}=fixture(1); let destination='';
 bindGalleryLightbox(root,{load:async()=>{throw Error('offline')}, navigate:href=>{destination=href}, reducedMotion:()=>false});
 root.querySelector('a')!.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}) as unknown as MouseEvent);
 await tick(); expect(destination).toBe('https://example.com/0.jpg');
});
test('cleanup removes listeners and disposes an opened gallery',async()=>{
 const {window,root}=fixture(1); let disposed=0; let loads=0;
 const cleanup=bindGalleryLightbox(root,{load:async()=>{loads++;return {open:(items)=>{expect(items).toHaveLength(1);expect(items[0].alt).toBe('Image 0');return ()=>{disposed++}}}},navigate:()=>{},reducedMotion:()=>true});
 const click=()=>root.querySelector('a')!.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}) as unknown as MouseEvent);
 click(); await tick(); cleanup(); click(); await tick();expect(disposed).toBe(1);expect(loads).toBe(1);
});
test('reduced motion disables transitions and keeps keyboard focus options',()=>{
 const options=createGalleryLightboxOptions(true);
 expect(options.showAnimationDuration).toBe(0);expect(options.hideAnimationDuration).toBe(0);expect(options.zoomAnimationDuration).toBe(0);
 expect(options.escKey).toBe(true);expect(options.arrowKeys).toBe(true);expect(options.trapFocus).toBe(true);expect(options.returnFocus).toBe(true);
});
test('the clicked anchor receives focus before opening for PhotoSwipe focus return', async()=>{
 const {window,root}=fixture(); let focused=false;
 const anchor=root.querySelectorAll('a')[1];
 bindGalleryLightbox(root,{load:async()=>({open:()=>{focused=window.document.activeElement === anchor as unknown as typeof window.document.activeElement;return ()=>{}}}),navigate:()=>{},reducedMotion:()=>false});
 anchor.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}) as unknown as MouseEvent);
 await tick();expect(focused).toBe(true);
});
test('cleanup during loading never opens or redirects', async()=>{
 const {window,root}=fixture(1);let opened=0;let redirects=0;let finish!: (module: {open:()=>()=>void})=>void;
 const cleanup=bindGalleryLightbox(root,{load:()=>new Promise(resolve=>{finish=resolve}),navigate:()=>{redirects++},reducedMotion:()=>false});
 root.querySelector('a')!.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}) as unknown as MouseEvent);
 cleanup();finish({open:()=>{opened++;return ()=>{}}});await tick();expect(opened).toBe(0);expect(redirects).toBe(0);
});
test('download, new-tab and non-primary clicks retain native browser behavior',()=>{
 const {window,root}=fixture(1);let loads=0;
 bindGalleryLightbox(root,{load:async()=>{loads++;throw Error()},navigate:()=>{},reducedMotion:()=>false});
 const anchor=root.querySelector('a')!;
 for (const modifier of ['metaKey','shiftKey','altKey']) {
  const event=new window.MouseEvent('click',{bubbles:true,cancelable:true,[modifier]:true});anchor.dispatchEvent(event as unknown as MouseEvent);expect(event.defaultPrevented).toBe(false);
 }
 anchor.target='_blank';const blank=new window.MouseEvent('click',{bubbles:true,cancelable:true});anchor.dispatchEvent(blank as unknown as MouseEvent);expect(blank.defaultPrevented).toBe(false);
 anchor.target='';anchor.download='photo.jpg';const download=new window.MouseEvent('click',{bubbles:true,cancelable:true});anchor.dispatchEvent(download as unknown as MouseEvent);expect(download.defaultPrevented).toBe(false);
 expect(loads).toBe(0);
});
test('a failed load leaves later clicks native until the binding is recreated', async()=>{
 const {window,root}=fixture(1);let loads=0;let redirects=0;
 bindGalleryLightbox(root,{load:async()=>{loads++;throw Error('stylesheet unavailable')},navigate:()=>{redirects++},reducedMotion:()=>false});
 const anchor=root.querySelector('a')!;
 const first=new window.MouseEvent('click',{bubbles:true,cancelable:true});
 anchor.dispatchEvent(first as unknown as MouseEvent);await tick();
 expect(first.defaultPrevented).toBe(true);expect(redirects).toBe(1);
 const second=new window.MouseEvent('click',{bubbles:true,cancelable:true});
 anchor.dispatchEvent(second as unknown as MouseEvent);await tick();
 expect(second.defaultPrevented).toBe(false);expect(loads).toBe(1);expect(redirects).toBe(1);
});
