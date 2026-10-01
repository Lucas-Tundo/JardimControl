/** plural(3, "tarefa", "tarefas") vira "3 tarefas". */
export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
