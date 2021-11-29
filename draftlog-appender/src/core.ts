import { Formatting, LogMessage } from '@niceties/logger/types';
import { createCanvas } from './details/canvas';
import { createModel } from './details/model';
import { Spinners } from './spinners';

interface DraftlogAppenderOptions {
    logAboveSpinners: boolean;
    defaultSpinner: string;
    fallbackSpinner: string;
}

export function createDraftlogAppender(options: DraftlogAppenderOptions, spinners: Spinners, formatting: Formatting) {
    let interval: NodeJS.Timer | undefined;
    const spinner = spinners[terminalSupportsUnicode() ? options.defaultSpinner : options.fallbackSpinner];

    const [updateModel, getModel] = createModel(options.logAboveSpinners);
    const renderModel = createCanvas(spinner, formatting);

    return function draftlogAppender(message: LogMessage) {
        renderModel(updateModel(message));
        checkTimeout();
    };

    function checkTimeout() {
        const spinning = getModel().spinning_;
        if (spinning && !interval) {
            interval = setInterval(updateSpinners, spinner.interval);
            interval.unref(); // unref immidiately just in case
        } else if (!spinning && interval) {
            clearInterval(interval);
            interval = undefined;
        }
    }

    function updateSpinners() {
        const model = getModel();
        model.tick_++;
        model.tick_ %= spinner.frames.length;
        renderModel(model);
    }
}

// from dreidels/utils
function terminalSupportsUnicode() {
    // The default command prompt and powershell in Windows do not support Unicode characters.
    // However, the VSCode integrated terminal and the Windows Terminal both do.
    return process.platform !== 'win32'
      || process.env.TERM_PROGRAM === 'vscode'
      || !!process.env.WT_SESSION;
}
