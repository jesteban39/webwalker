import { Page } from 'puppeteer';
import * as db from '../database';


// **** Variables **** //

export enum ActionOptions {
    openPage = 'openPage',
    closePage = 'closePage',
    stop = 'stop',
    click = 'click',
    type = 'type',
    typePass = 'typePass',
    paste = 'paste',
    pasteText = 'pasteText',
    copyText = 'copyText',
    copyLinck = 'copyLinck',
    poketExtract = 'poketExtract',
    poketRefine = 'poketRefine',
    duplicatePocket = 'duplicatePocket',
    chek = 'chek',
    none = 'none'
}

// **** Types **** //

export interface Step {
    id: string,
    description: string,
    action: ActionOptions,
    selector: string,
    pocket: string,
    payload: string,
    catch: string[],
}

export interface Pocket {
    name: string,
    content: string,
}

export interface Way {
    id: string,
    description: string,
    repeat: number,
    steps: string[],
}

export type Spot = [number, Spot?];

export interface Entry {
    value: string,
    steps: string[],
}

export interface Detour {
    id: string,
    description: string,
    pocket: string,
    entrys: Entry[],
}

export interface InSpot {
    isRun: boolean,
    limit: number,
    wayId: string,
    spot: Spot
}


// **** Functions **** //

/**
 * abre una nueva ventada en URL espesificada en step.payload
 * @param page
 * @param step
 */
const openPage = async (page: Page, step: Step) => {
    const pocket = await db.getPocket(step.payload);
    if (!pocket) throw new Error('No se encontro el pocket ' + step.payload);
    page.goto(pocket.content);
    await new Promise((res: Function, _rej) => {
        setTimeout(() => res(), 3000);
    });
}

/**
 * Cierra la ventana actual de page
 * @param page
 * @param _step
 */
const closePage = async (page: Page, _step: Step) => {
    await page.close();
}

/**
 * Espera los milisegundos espesificados en step.payload
 * @param _page
 * @param step
 */
const stop = async (_page: Page, step: Step) => {
    await new Promise((res: Function, _rej) => {
        setTimeout(() => res(), parseInt(step.payload));
    });
}

/**
 * Hace click en el elemmento seleccionado con step.selector
 * @param page
 * @param step
 */
const click = async (page: Page, step: Step) => {
    await page.waitForSelector(step.selector);
    await page.click(step.selector);
}

/**
 * Incresa por teclado el texto especificado en step.payload
 * dentro del elemento editable especificado en step.selector
 * @param page
 * @param step
 */
const type = async (page: Page, step: Step) => {
    const pocket = db.getPocket(step.payload);
    if (!pocket) throw new Error('No se encontro el pocket ' + step.payload);
    await page.waitForSelector(step.selector);
    await page.type(step.selector, pocket.content);
}

/**
 * 
 * @param page 
 * @param step 
 */
const typePass = async (page: Page, step: Step) => {
    const pocket = db.getPocket(step.pocket);
    if (!pocket) throw new Error('No se encontro el pocket ' + step.payload);
    await page.waitForSelector(step.selector);
    const pass = pocket.content.split('');
    for (let i = 0; i < pass.length; i++) {
        await new Promise((r) => setTimeout(r, parseInt(step.payload)));
        await page.type(step.selector, pass[i]);
    }
}

/**
 * Setea el valor del elemento tipo input seleccionado con step.selector
 * con el texto especificado en el clipboard step.payload
 * @param page
 * @param step
 */
const paste = async (page: Page, step: Step) => {
    const pocket = db.getPocket(step.pocket);
    if (!pocket && !step.payload) throw new Error('No se encontro el clipboard ' + step.payload);
    await page.waitForSelector(step.selector);
    const paste = (el: any, text: string) => { el.value = text }
    const text1 = (pocket?.content || step.payload).slice(0, -1);
    const text2 = (pocket?.content || step.payload).slice(-1);
    await page.$eval(step.selector, paste, text1);
    await page.type(step.selector, text2);
}

/**
 * Setea el innerText de un elemento editable seleccionado con step.selector
 * con el texto especificado en el clipboard step.payload
 * @param page
 * @param step
 */
const pasteText = async (page: Page, step: Step) => {
    const pocket = await db.getPocket(step.payload);
    if (!pocket) throw new Error('No se encontro el clipboard ' + step.payload);
    await page.waitForSelector(step.selector);
    const paste = (el: any, text: string) => el.innerText = text;
    await page.$eval(step.selector, paste, pocket.content);
    await page.type(step.selector, ' ');
}

/**
 * Extrae el texto del elemento seleccionado con step.selector
 * y lo guarda en el pocket especificado en step.payload
 * @param page
 * @param step
 */
const copyText = async (page: Page, step: Step) => {
    await page.waitForSelector(step.selector);
    const text = await page.$eval(step.selector, (el: any) => el.innerText);
    db.putPocket({ name: step.pocket, content: text });
    console.log(step.pocket, ' : ', text);
}

/**
 * Extrae enlace del elemento <a> seleccionado con step.selector
 * y lo guarda en el clipboard especificado en step.payload
 * @param page
 * @param step
 */
const copyLinck = async (page: Page, step: Step) => {
    await page.waitForSelector(step.selector);
    const linck = await page.$eval(step.selector, (el: any) => el.href);
    db.putPocket({ name: step.payload, content: linck });
}

/**
 * Reempleza el poket optenido con step.pocket, con el primer resultado de evaluar
 *  poket.content con la RegExp contenida en step.payload
 * @param _page
 * @param step
 */
const poketExtract = async (_page: Page, step: Step) => {
    const pocket = await db.getPocket(step.pocket);
    if (!pocket) throw new Error('No se encontro el pocket ' + step.pocket);
    const [text] = (pocket.content.match(step.payload) || ['']);
    db.putPocket({ name: step.pocket, content: text || '' });
}

/**
 * Recupera el pocket optenido con step.pocket y reemplaza
 * las coincidencias al evaluarlo con la RegExp contenida en step.payload
 * con el contenido del pocket optenido con step.selector,
 * si no encuentra el pocket step.selector borra las coincidencias.
 * @param _page
 * @param step
 */
const poketRefine = async (_page: Page, step: Step) => {
    const pocket = db.getPocket(step.pocket);
    if (!pocket) throw new Error('No se encontro el pocket ' + step.pocket);
    const value = db.getPocket(step.selector);
    const text = pocket.content.replaceAll(step.payload, value?.content || '');
    db.putPocket({ name: step.pocket, content: text });
}

/**
 * Crea un nuevo poket o lo setea si ya existe, con el contenido
 * de payload, de otro pocket o sin contenido.
 * @param _page
 * @param step
 */
const duplicatePocket = async (_page: Page, step: Step) => {
    const pocket = db.getPocket(step.selector);
    db.putPocket({ name: step.pocket, content: pocket?.content || step.payload || '' });
}

/**
 * Verifica si el elemento con el selector step.selector existe en el DOM
 * @param page
 * @param step
 */
const chek = async (page: Page, step: Step) => {
    await page.waitForSelector(step.selector);
}

/**
 * Hacer nada
 * @param _page
 * @param _step
 */
const none = async (_page: Page, _step: Step) => { }


export function getAction(key: ActionOptions) {
    //console.log('action: ', key);
    switch (key) {
        case ActionOptions.openPage: return openPage;
        case ActionOptions.closePage: return closePage;
        case ActionOptions.stop: return stop;
        case ActionOptions.click: return click;
        case ActionOptions.type: return type;
        case ActionOptions.typePass: return typePass;
        case ActionOptions.paste: return paste;
        case ActionOptions.pasteText: return pasteText;
        case ActionOptions.copyText: return copyText;
        case ActionOptions.copyLinck: return copyLinck;
        case ActionOptions.poketExtract: return poketExtract;
        case ActionOptions.poketRefine: return poketRefine;
        case ActionOptions.duplicatePocket: return duplicatePocket;
        case ActionOptions.chek: return chek;
        case ActionOptions.none: return none;
    }
}

export default {
    getAction
}
