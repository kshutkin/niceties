import type { Formatter, LogMessage } from '@niceties/logger/types';
import { createCanvas } from './details/canvas';
import { createModel } from './details/model';
import type { Spinner } from './spinners';

export function createDraftlogAppender(spinner: Spinner, formatter: Formatter, logAboveSpinners: boolean, ident: number) {
    let interval: NodeJS.Timeout | undefined;

    const [updateModel, getModel] = createModel(logAboveSpinners);
    const renderModel = createCanvas(spinner, formatter, ident);

    return (message: LogMessage) => {
        renderModel(updateModel(message));
        checkTimeout();
    };

    function checkTimeout() {
        const spinning = getModel().spinning;
        if (spinning && !interval) {
            interval = setInterval(updateSpinners, spinner.interval);
            interval.unref(); // unref immediately just in case
        } else if (!spinning && interval) {
            clearInterval(interval);
            interval = undefined;
        }
    }

    function updateSpinners() {
        const model = getModel();
        model.tick++;
        model.tick %= spinner.frames.length;
        renderModel(model);
    }
}


