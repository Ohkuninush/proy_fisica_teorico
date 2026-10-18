const GOAL_RULES = [
  [/Choque estimado/g, 'Llegada estimada'],
  [/Velocidad de impacto/g, 'Velocidad de llegada'],
  [/no hay choque/g, 'no cruza la meta'],
  [/del obstáculo/g, 'de la meta'],
  [/al obstáculo/g, 'a la meta'],
  [/el obstáculo/g, 'la meta'],
  [/Obstáculo/g, 'Meta'],
  [/obstáculo/g, 'meta'],
];

export const toGoalWording = (text) => GOAL_RULES.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
