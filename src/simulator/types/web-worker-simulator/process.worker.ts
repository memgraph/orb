// / <reference lib="webworker" />
import { D3SimulatorEngine, D3SimulatorEngineEventType } from '../../engine/d3-simulator-engine';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';

const simulator = new D3SimulatorEngine();

const emitToMain = (message: IWorkerOutputPayload) => {
  // @ts-ignore Web worker postMessage is a global function
  postMessage(message);
};

simulator.on(D3SimulatorEngineEventType.TICK, (data) => {
  emitToMain({ type: WorkerOutputType.NodeDragged, data });
});

simulator.on(D3SimulatorEngineEventType.END, (data) => {
  emitToMain({ type: WorkerOutputType.NodeDragEnded, data });
});

simulator.on(D3SimulatorEngineEventType.STABILIZATION_STARTED, () => {
  emitToMain({ type: WorkerOutputType.StabilizationStarted });
});

simulator.on(D3SimulatorEngineEventType.STABILIZATION_PROGRESS, (data) => {
  emitToMain({ type: WorkerOutputType.StabilizationProgress, data });
});

simulator.on(D3SimulatorEngineEventType.STABILIZATION_ENDED, (data) => {
  emitToMain({ type: WorkerOutputType.StabilizationEnded, data });
});

simulator.on(D3SimulatorEngineEventType.NODE_DRAGGED, (data) => {
  // Notify the client that the node position changed.
  // This is otherwise handled by the simulation tick if physics is enabled.
  emitToMain({ type: WorkerOutputType.NodeDragged, data });
});

simulator.on(D3SimulatorEngineEventType.SETTINGS_UPDATED, (data) => {
  emitToMain({ type: WorkerOutputType.SettingsUpdated, data });
});

addEventListener('message', ({ data }: MessageEvent<IWorkerInputPayload>) => {
  switch (data.type) {
    case WorkerInputType.ActivateSimulation: {
      simulator.activateSimulation();
      break;
    }

    case WorkerInputType.SetData: {
      simulator.setData(data.data);
      break;
    }

    case WorkerInputType.StartSimulation: {
      simulator.startSimulation(data.data);
      break;
    }

    case WorkerInputType.UpdateSimulation: {
      simulator.updateSimulation(data.data);
      break;
    }

    case WorkerInputType.StopSimulation: {
      simulator.stopSimulation();
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

    case WorkerInputType.EndDragNode: {
      simulator.endDragNode(data.data);
      break;
    }

    case WorkerInputType.SetPhysics: {
      simulator.setPhysics({ isEnabled: data.data.isEnabled });
      break;
    }

    case WorkerInputType.SetSettings: {
      simulator.setSettings(data.data);
      break;
    }
  }
});
