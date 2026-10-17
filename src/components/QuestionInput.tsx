import type { Json } from "../lib/database";
import type { RecruitmentQuestion } from "../lib/recruitment";
import { inputCls } from "./ui";
export function answerIsEmpty(value: Json | undefined) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && !value.length)
  );
}
export function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: RecruitmentQuestion;
  value: Json | undefined;
  onChange: (value: Json) => void;
}) {
  const options = Array.isArray(question.options)
    ? question.options.filter((item): item is string => typeof item === "string")
    : [];
  if (question.question_type === "single_choice")
    return (
      <select
        required={question.required}
        className={inputCls}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  if (question.question_type === "multi_choice")
    return (
      <span className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm"
          >
            <input
              type="checkbox"
              checked={Array.isArray(value) && value.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...(Array.isArray(value) ? value : []), option]
                    : Array.isArray(value)
                      ? value.filter((item) => item !== option)
                      : [],
                )
              }
            />
            {option}
          </label>
        ))}
      </span>
    );
  if (question.question_type === "long_text")
    return (
      <textarea
        rows={3}
        required={question.required}
        className={inputCls}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  return (
    <input
      type={
        question.question_type === "url"
          ? "url"
          : question.question_type === "number"
            ? "number"
            : "text"
      }
      required={question.required}
      className={inputCls}
      value={String(value ?? "")}
      onChange={(event) =>
        onChange(
          question.question_type === "number" && event.target.value !== ""
            ? Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}
