import { WorkerMessage } from '../types';
import { generalize } from './generalize';

export interface WorkerGlobalScope {
    onmessage: (event: { data: WorkerMessage }) => void;
    postMessage: (message: any, transfer?: any[]) => void;
}

// tslint:disable-next-line:no-default-export
export default (self: WorkerGlobalScope) => {
    self.onmessage = (event) => {
        generalize(event.data);

        const { markers, labels } = event.data;

        self.postMessage({
            markerArray: markers,
            labelArray: labels,
        }, [
            markers.buffer,
            labels.buffer,
        ]);
    };
};
