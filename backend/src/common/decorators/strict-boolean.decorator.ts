import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * An optional boolean body field that cannot be faked into `true`.
 *
 * The global ValidationPipe runs with `enableImplicitConversion`, which casts
 * a property declared as `boolean` using JS truthiness: `"false"`, `"yes"` and
 * `1` all become `true`, and `@IsBoolean()` then sees a valid boolean and
 * passes. For a switch that starts outbound calls that is unacceptable.
 *
 * Declaring the property as `unknown` keeps the reflected design type as
 * Object (so no implicit cast happens), the transform accepts only real
 * booleans plus the exact strings "true"/"false", and anything else is left
 * as-is for `@IsBoolean()` to reject with a 400.
 *
 * Usage:
 *   `@StrictOptionalBoolean() my_flag?: unknown;`
 * then read it as a boolean after validation.
 */
export function StrictOptionalBoolean() {
  return applyDecorators(
    IsOptional(),
    Transform(({ value }) => {
      if (value === true || value === 'true') return true;
      if (value === false || value === 'false') return false;
      return value; // rejected by IsBoolean below
    }),
    IsBoolean(),
  );
}
