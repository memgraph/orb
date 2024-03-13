// / <reference lib="webworker" />
import { D3SimulatorEngine, D3SimulatorEngineEventType } from '../../engine/d3-simulator-engine';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';

const simulator = new D3SimulatorEngine();

const emitToMain = (message: IWorkerOutputPayload) => {
  // @ts-ignore Web worker postMessage is a global function
  postMessage(message);
};

simulator.on(D3SimulatorEngineEventType.SIMULATION_START, () => {
  emitToMain({ type: WorkerOutputType.SIMULATION_START });
});

simulator.on(D3SimulatorEngineEventType.SIMULATION_PROGRESS, (data) => {
  emitToMain({ type: WorkerOutputType.SIMULATION_PROGRESS, data });
});

simulator.on(D3SimulatorEngineEventType.SIMULATION_END, (data) => {
  emitToMain({ type: WorkerOutputType.SIMULATION_END, data });
});

simulator.on(D3SimulatorEngineEventType.NODE_DRAG, (data) => {
  emitToMain({ type: WorkerOutputType.NODE_DRAG, data });
});

simulator.on(D3SimulatorEngineEventType.SIMULATION_TICK, (data) => {
  emitToMain({ type: WorkerOutputType.SIMULATION_STEP, data });
});

simulator.on(D3SimulatorEngineEventType.SETTINGS_UPDATE, (data) => {
  emitToMain({ type: WorkerOutputType.SETTINGS_UPDATE, data });
});

addEventListener('message', ({ data }: MessageEvent<IWorkerInputPayload>) => {
  switch (data.type) {
    case WorkerInputType.ActivateSimulation: {
      simulator.activateSimulation();
      break;
    }

    case WorkerInputType.SetupData: {
      simulator.setupData(data.data);
      break;
    }

    case WorkerInputType.MergeData: {
      simulator.mergeData(data.data);
      break;
    }

    case WorkerInputType.UpdateData: {
      simulator.updateData(data.data);
      break;
    }

    case WorkerInputType.DeleteData: {
      simulator.deleteData(data.data);
      break;
    }

    case WorkerInputType.ClearData: {
      simulator.clearData();
      break;
    }

    case WorkerInputType.StartDragNode: {
      simulator.startDragNode();
      break;
    }

    case WorkerInputType.DragNode: {
      simulator.dragNode(data.data);
      break;
    }

    case WorkerInputType.FixNodes: {
      simulator.stickNodes(data.data.nodes);
      break;
    }

    case WorkerInputType.ReleaseNodes: {
      simulator.unstickNodes(data.data.nodes);
      break;
    }

    case WorkerInputType.EndDragNode: {
      simulator.endDragNode(data.data);
      break;
    }

    case WorkerInputType.SetSettings: {
      simulator.setSettings(data.data);
      break;
    }
  }
});
