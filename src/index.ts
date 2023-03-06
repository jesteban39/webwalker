import puppeteer, { Page } from 'puppeteer';
import * as db from './database';
import { getAction, Spot, Way } from '@models/Step';

const runStep = (page: Page, stepId: string, i: number): Promise<Way | undefined> => {
    const step = db.getStep(stepId);
    if (!step) throw new Error('No se encontro Step ' + stepId);
    else console.log(i, step.id, step.description);
    const action = getAction(step.action);
    if (!action) throw new Error('No se encontro action ' + step.action);

    return new Promise((resolve, _rejected) => {
        action(page, step)
            .then(() => resolve(undefined))
            .catch((error) => {
                console.error(error);
                console.log(step.id + ' :> intento fallido');
                resolve({
                    id: 'Way>' + step.id.replace('Step>', 'Catch-'),
                    description: 'Medida de contingencia para el step ' + step.id,
                    repeat: 1,
                    steps: step.catch
                });
            });
    });

}

const tack = (stepId: string): Way => {
    const detour = db.getDetour(stepId);
    if (!detour) throw new Error('El detour ' + stepId + ' no es valido');
    else console.log(detour.id, detour.description);
    const pocket = db.getPocket(detour.pocket);
    if (!pocket) throw new Error('El pocket ' + detour.pocket + ' no es valido');
    const entry = detour.entrys.find((entry) => entry.value === pocket.content);
    console.log(' value: ' + entry?.value );
    const entryDefault = detour.entrys.find((entry) => entry.value === 'default');
    if (!entry && !entryDefault) throw new Error('El detour no tine entry para ' + pocket.content);
    return {
        id: detour.id.replace('Detour', 'Way'),
        description: detour.description,
        repeat: 1,
        steps: entry?.steps || entryDefault?.steps || []
    }
}

const walk = async (page: Page, way: Way, spot: Spot = [0], limit: number) => {
    const [start, nextSpot] = spot;
    console.log(spot, way.id, way.description);
    for (let i = 0; i < way.repeat; i++) {
        for (let j = start; j < way.steps.length; j++) {
            const stepId = way.steps[j];
            const spot: Spot = j === start ? nextSpot || [0] : [0];
            const [sort] = stepId.split('>');
            if (sort === 'Step') {
                const wayS = await runStep(page, stepId, j);
                if (wayS && wayS.steps.length > 0) {
                    if (limit <= 0) throw new Error('limite de reintentos alcanzado');
                    await walk(page, wayS, spot, --limit);
                }
            } else if (sort === 'Way') {
                const wayJ = db.getWay(stepId);
                if (!wayJ) throw new Error('No se encontro Way ' + stepId);
                else await walk(page, wayJ, spot, limit);
            } else if (sort === 'Detour') {
                const wayD = tack(way.steps[j]);
                await walk(page, wayD, spot, limit);
            } else throw new Error('El id ' + stepId + ' no es valido');
        }
    }
}

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 12,
            defaultViewport: {
                width: 1200,
                height: 570
            }
        });

        const page = await browser.newPage();
        await db.setInSpot(true);

        do {
            await db.updateFromDB();
            const inSpot = await db.getInSpot();
            if (inSpot.isRun) {
                const way = db.getWay(inSpot.wayId);
                if (!way) throw new Error('No se encontro Way ' + inSpot.wayId);
                await walk(page, way, inSpot.spot, inSpot.limit)
                    .catch((error) => console.error(error));
                await db.setInSpot(false);
            } else await new Promise((res: Function) => setTimeout(() => res(), 3000));
        } while (true);

    } catch (error) {
        console.error(error);
    }

})()