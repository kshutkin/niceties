import { Formatter, LogMessage } from '@niceties/logger/types';
import { createCanvas } from './details/canvas';
import { createModel } from './details/model';
import { Spinner } from './spinners';

export const createDraftlogAppender = (spinner: Spinner, formatter: Formatter, logAboveSpinners: boolean, ident: number) => {
    let interval: NodeJS.Timer | undefined;

    const [updateModel, getModel] = createModel(logAboveSpinners);
    const renderModel = createCanvas(spinner, formatter, ident);

    const checkTimeout = () => {
        const spinning = getModel().spinning;
        if (spinning && !interval) {
            interval = setInterval(updateSpinners, spinner.interval);
            interval.unref(); // unref immidiately just in case
        } else if (!spinning && interval) {
            clearInterval(interval);
            interval = undefined;
        }
    };

    const updateSpinners = () => {
        const model = getModel();
        model.tick++;
        model.tick %= spinner.frames.length;
        renderModel(model);
    };

    return (message: LogMessage) => {
        renderModel(updateModel(message));
        checkTimeout();
    };
};


