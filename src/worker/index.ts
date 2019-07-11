import { WorkerMessage } from '../types';
import { generalize } from './generalize';

export interface WorkerGlobalScope {
    onmessage: (event: { data: WorkerMessage }) => void;
    postMessage: (message: any, transfer?: any[]) => void;
}

// tslint:disable-next-line:no-default-export
export default (self: WorkerGlobalScope) => {
    self.onmessage = (event) => {
        const data = event.data;
        generalize(data);
        self.postMessage(data.markers);
    };
};
