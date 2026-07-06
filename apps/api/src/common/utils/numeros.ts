// Máximo de un INT4 de PostgreSQL. Cota superior de los enteros que mapean a
// columnas Int, para que un overflow se rechace como 400 (validación) y no
// llegue a Prisma y explote en 500.
export const MAX_INT4 = 2147483647;
