// / <reference lib="webworker" />
import { LayoutEngineFactory } from '../../engine/factory';
import { ILayoutEngine } from '../../engine/shared';
import { SimulatorEventType } from '../../shared';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';

let engine: ILayoutEngine = LayoutEngineFactory.create({ type: 'force' });

const emitToMain = (message: IWorkerOutputPayload) => {
  postMessage(message);
};

function wireEngineEvents(target: ILayoutEngine) {
  target.on(SimulatorEventType.SIMULATION_START, () => {
    emitToMain({ type: WorkerOutputType.SIMULATION_START });
  });
  target.on(SimulatorEventType.SIMULATION_PROGRESS, (data) => {
    emitToMain({ type: WorkerOutputType.SIMULATION_PROGRESS, data });
  });
  target.on(SimulatorEventType.SIMULATION_END, (data) => {
    emitToMain({ type: WorkerOutputType.SIMULATION_END, data });
  });
  target.on(SimulatorEventType.SIMULATION_STEP, (data) => {
    emitToMain({ type: WorkerOutputType.SIMULATION_STEP, data });
  });
  target.on(SimulatorEventType.NODE_DRAG, (data) => {
    emitToMain({ type: WorkerOutputType.NODE_DRAG, data });
  });
  target.on(SimulatorEventType.SETTINGS_UPDATE, (data) => {
    emitToMain({ type: WorkerOutputType.SETTINGS_UPDATE, data });
  });
}

wireEngineEvents(engine);

addEventListener('message', ({ data }: MessageEvent<IWorkerInputPayload>) => {
  switch (data.type) {
    case WorkerInputType.SetLayoutEngine: {
      engine.removeAllListeners();
      engine.terminate();
      engine = LayoutEngineFactory.create(data.data);
      wireEngineEvents(engine);
      break;
    }

    case WorkerInputType.SetupData: {
      engine.setupData(data.data);
      break;
    }

    case WorkerInputType.MergeData: {
      engine.mergeData(data.data);
      break;
    }

    case WorkerInputType.UpdateData: {
      engine.updateData(data.data);
      break;
    }

    case WorkerInputType.DeleteData: {
      engine.deleteData(data.data);
      break;
    }

    case WorkerInputType.PatchData: {
      engine.patchData(data.data);
      break;
    }

    case WorkerInputType.ClearData: {
      engine.clearData();
      break;
    }

    case WorkerInputType.ActivateSimulation: {
      engine.activateSimulation();
      break;
    }

    case WorkerInputType.StopSimulation: {
      engine.stopSimulation();
      break;
    }

    case WorkerInputType.StartDragNode: {
      engine.startDragNode();
      break;
    }

    case WorkerInputType.DragNode: {
      engine.dragNode(data.data.id, { x: data.data.x, y: data.data.y });
      break;
    }

    case WorkerInputType.EndDragNode: {
      engine.endDragNode(data.data.id);
      break;
    }

    case WorkerInputType.FixNodes: {
      engine.fixNodes(data.data.nodes);
      break;
    }

    case WorkerInputType.ReleaseNodes: {
      engine.releaseNodes(data.data.nodes);
      break;
    }

    case WorkerInputType.SetSettings: {
      engine.setSettings(data.data);
      break;
    }
  }
});
