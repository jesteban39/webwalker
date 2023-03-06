import jsonfile from 'jsonfile';
import { Step, Way, InSpot, Pocket, Detour } from '@models/Step';


const inSpotFile = 'inSpot.json';
const stepFile = 'step.json';
const wayFile = 'way.json';
const detourFile = 'detour.json';
const pocketFile = 'pocket.json';

let stepList: Step[] = [];
let wayList: Way[] = [];
let detourList: Detour[] = [];
let pocketList: Pocket[] = [];

/**
 * 
 */
export const updateFromDB = async () => {
    stepList = await jsonfile.readFile(__dirname + '/' + stepFile);
    wayList = await jsonfile.readFile(__dirname + '/' + wayFile);
    detourList = await jsonfile.readFile(__dirname + '/' + detourFile);
    const pocketsDB: Pocket[] = await jsonfile.readFile(__dirname + '/' + pocketFile);
    pocketsDB.forEach((pocket) => putPocket(pocket));
}

/**
 * Retorna el inSpot almacenado en DB
 * @returns inSpot
 */
export const getInSpot = async (): Promise<InSpot> => {
    return await jsonfile.readFile(__dirname + '/' + inSpotFile);
}

/**
 * Setea el Step inicial en DB
 * @param isRun 
 * @returns
 */
export const setInSpot = async (isRun: boolean): Promise<void> => {
    const inSpot = await jsonfile.readFile(__dirname + '/' + inSpotFile);
    return await jsonfile.writeFile((__dirname + '/' + inSpotFile), {...inSpot, isRun});
}

/**
 * Retorna un Step para un ID dado
 * @param stepId ID del Step que desea optener
 * @returns El step seleccionado o undefined si no se encunetra
 */
export const getStep = (stepId: string) => stepList.find((step) => step.id === stepId);

/**
 * Actualizar todos los Stps en DB con nueva caracteristica  --Dev
 * @param steps Listado de Steps
 * @returns
 */
export const updateStepList = (steps: Step[]): Promise<void> => {
    const newSteps = steps.map((step) => {
        return {
            id: step.id,
            description: step.description,
            action: step.action || 'none',
            selector: step.selector || '',
            pocket: step.pocket || '',
            payload: step.payload || '',
            catch: step.catch
        }
    });
    return jsonfile.writeFile((__dirname + '/' + stepFile), newSteps);
}

/**
 * Retorna un Way para un ID dado.
 * @param wayId ID de way que se desea optener.
 * @returns Way seleccionada o undefine si no se encunetra. 
 */
export const getWay = (wayId: string) => wayList.find((way) => way.id === wayId);

/**
 * Consulta un Detours por su ID y lo retorna
 * @param detourId 
 * @returns Detour o undefined
 */
export const getDetour = (detourId: string) => detourList.find((d) => d.id === detourId);

/**
 * Actualiza nuevas caracteristicas a todos los detours --Dev
 * @returns 
 */
export const updateDetours = async () => {
    const newDetours = detourList.map((detour) => {
        return {
            id: detour.id,
            description: detour.description,
            pocket: detour.pocket,
            entrys: detour.entrys.map((entry) => {
                return {
                    value: entry.value,
                    way: [entry.steps]
                }
            })
        }
    });
    return jsonfile.writeFile((__dirname + '/' + detourFile), newDetours);
}

/**
 * Retorna un Pocket buscando por name
 * @param name 
 * @returns 
 */
export const getPocket = (name: string) => {
    return pocketList.find((pocket) => pocket.name === name);
}

/**
 * Guarda todos los Pocket en DB
 * @param pockets Listado de Pocket
 * @returns
 */
export const setPocketList = async (pockets: Pocket[]): Promise<void> => {
    return await jsonfile.writeFile((__dirname + '/' + pocketFile), pockets);
}

/**
 * Agrega o sobresescuibe un Pocket en DB
 * @param name 
 * @param content 
 * @returns 
 */
export const putPocket = (pocket: Pocket) => {
    const { name, content } = pocket;
    if (pocketList.find((p) => p.name === name)) {
        pocketList = pocketList.map((pocket) => {
            if (pocket.name === name)
                return { name, content };
            else return pocket;
        });
    }
    pocketList.push({ name, content });
}

const xphatToSelector = (xphat: string): string => {
    return xphat
        .replace('/html/', 'html/')
        .replaceAll('[', ':nth-child(')
        .replaceAll(']', ')')
        .replaceAll('/', ' > ');
}
