export function controlsState(status) {
  const editable = status === 'idle' || status === 'finished' || status === 'collided';
  return {
    start: status === 'idle',
    pause: status === 'running' || status === 'paused',
    pauseLabel: status === 'paused' ? 'Reanudar' : 'Pausar',
    reset: status !== 'idle',
    defaults: editable,
    configInputs: editable,
  };
}
