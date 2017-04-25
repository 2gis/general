import { WorkerMessage } from '../types';
import { generalize } from './generalize';

declare const postMessage: (message: any, transfer?: any[]) => void;

onmessage = (event) => {
    const data: WorkerMessage = event.data;
    generalize(data);
    postMessage(data.markers);
};
