import { LookupExpression } from "../expression.ts";
import { IntegerValue, isCountableValue } from "../values.ts";
import { LookupContext } from "../context.ts";
import { LookupEvaluationError } from "../errors.ts";

/**
 * count(entry): returns the count of the specified value
 * -> Lazy Query: give the number of results (rows)
 * -> List: give the number of items in the list
 */
export class Count extends LookupExpression {
    // An expression that specifies what value's count we want to retrieve
    readonly exprToCount: LookupExpression;

    constructor(exprToCount: LookupExpression) {
        super();
        this.exprToCount = exprToCount;
    }

    public async getValue(context: LookupContext) {
        const valueToCount = await this.exprToCount.getValue(context);
        if (isCountableValue(valueToCount)) {
            return new IntegerValue(await valueToCount.getCount());
        } else {
            throw new LookupEvaluationError(
                `The expression "${this.exprToCount.toDebugString()}" cannot be counted with count().`,
            );
        }
    }

    public toString(): string {
        return `count(${this.exprToCount.toString()})`;
    }
}
