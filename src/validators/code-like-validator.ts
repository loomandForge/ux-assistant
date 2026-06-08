import { ValidationFinding } from '../contract.js';
import { severityFromPriority, ValidatorRuleInput } from './types.js';

const CODE_OUTPUT_TYPES = new Set(['html', 'react_code']);
const MAX_EVIDENCE_ITEMS = 4;

type SourceElement = {
  tag: string;
  attrs: string;
  body: string;
};

const unique = (items: string[]): string[] =>
  [...new Set(items.map(item => item.trim()).filter(Boolean))];

const summarize = (items: string[], fallback: string): string => {
  const values = unique(items);
  if (values.length === 0) return fallback;
  const shown = values.slice(0, MAX_EVIDENCE_ITEMS);
  const suffix = values.length > shown.length ? `, +${values.length - shown.length} more` : '';
  return `${shown.join(', ')}${suffix}`;
};

const stripMarkup = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getAttr = (attrs: string, name: string): string | null => {
  const quoted = attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  if (quoted?.[1]) return quoted[1];

  const braced = attrs.match(new RegExp(`${name}\\s*=\\s*\\{["']([^"']+)["']\\}`, 'i'));
  if (braced?.[1]) return braced[1];

  return null;
};

const extractActionElements = (source: string): SourceElement[] => {
  const elements: SourceElement[] = [];
  const actionTag = '(?:button|a|Button|Link|[A-Za-z][\\w.]*(?:Button|Link|CTA))';
  const paired = new RegExp(`<(${actionTag})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'g');
  const selfClosing = new RegExp(`<(${actionTag})\\b([^>]*)\\/>`, 'g');

  for (const match of source.matchAll(paired)) {
    elements.push({ tag: match[1] ?? '', attrs: match[2] ?? '', body: match[3] ?? '' });
  }

  for (const match of source.matchAll(selfClosing)) {
    elements.push({ tag: match[1] ?? '', attrs: match[2] ?? '', body: '' });
  }

  return elements;
};

const hasPrimaryClassToken = (value: string | null): boolean => {
  if (!value) return false;
  return value
    .split(/\s+/)
    .some(token =>
      /^(primary|primary-cta|cta-primary|btn-primary|button-primary)$/i.test(token)
    );
};

const hasPrimaryMarker = (element: SourceElement): boolean => {
  const tag = element.tag.toLowerCase();
  const className = getAttr(element.attrs, 'class') ?? getAttr(element.attrs, 'className');
  const variant = getAttr(element.attrs, 'variant') ?? getAttr(element.attrs, 'data-variant');
  const intent = getAttr(element.attrs, 'intent') ?? getAttr(element.attrs, 'appearance');

  return (
    hasPrimaryClassToken(className) ||
    variant?.toLowerCase() === 'primary' ||
    intent?.toLowerCase() === 'primary' ||
    /\sprimary(?:\s|$)/i.test(element.attrs) ||
    (/primary/i.test(tag) && /(button|link|cta)/i.test(tag))
  );
};

const isActionElement = (element: SourceElement): boolean => {
  const tag = element.tag.toLowerCase();
  return tag === 'button' || tag === 'a' || tag === 'link' || /(button|link|cta)$/i.test(tag);
};

const elementLabel = (element: SourceElement): string => {
  const explicit =
    getAttr(element.attrs, 'aria-label') ??
    getAttr(element.attrs, 'title') ??
    getAttr(element.attrs, 'label');
  const label = stripMarkup(explicit ?? element.body);
  return label.length > 0 ? label.slice(0, 72) : `<${element.tag}>`;
};

const extractPrimaryCtas = (source: string): string[] => {
  const labels = extractActionElements(source)
    .filter(element => isActionElement(element) && hasPrimaryMarker(element))
    .map(elementLabel)
    .map(label => label.trim())
    .filter(label => label.length > 0);

  if (labels.length > 0) return labels;
  const fallbackMarkers =
    source.match(/btn-primary|button-primary|cta-primary|primary cta|variant\s*=\s*["']primary["']/gi) ??
    [];
  return fallbackMarkers.map(marker => marker.replace(/\s+/g, ' ').trim());
};

const extractHardcodedColors = (source: string): string[] =>
  unique([
    ...(source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
    ...(source.match(/\brgba?\([^)]+\)/gi) ?? []),
    ...(source.match(/\bhsla?\([^)]+\)/gi) ?? [])
  ]);

const extractHeadingLevels = (source: string): number[] =>
  [...source.matchAll(/<h([1-6])\b/gi)]
    .map(match => Number(match[1]))
    .filter(level => Number.isInteger(level));

const hasMainLandmark = (source: string): boolean =>
  /<main\b/i.test(source) || /role\s*=\s*["']main["']/i.test(source);

const hasNavigationLandmark = (source: string): boolean =>
  /<nav\b/i.test(source) || /role\s*=\s*["']navigation["']/i.test(source);

const hasFormControl = (source: string): boolean =>
  /<(form|input|textarea|select)\b/i.test(source);

const hasFieldLabel = (source: string): boolean =>
  /<label\b/i.test(source) || /aria-label\s*=|aria-labelledby\s*=/i.test(source);

const hasErrorStateEvidence = (source: string): boolean =>
  /aria-invalid\s*=\s*["']?true/i.test(source) ||
  /role\s*=\s*["']alert["']/i.test(source) ||
  /aria-describedby\s*=/i.test(source) ||
  /(class|className|id)\s*=\s*["'][^"']*(error|invalid)[^"']*["']/i.test(source) ||
  /data-(error|invalid)\s*=/i.test(source);

const evaluateCtaRule = (
  rule: ValidatorRuleInput,
  outputContent: string,
  severity: ValidationFinding['severity']
): ValidationFinding => {
  const primaryCtas = extractPrimaryCtas(outputContent);
  const count = primaryCtas.length;
  const evidenceList = summarize(primaryCtas, 'No primary CTA markers detected.');

  if (count === 1) {
    return {
      ruleId: rule.ruleId,
      status: 'pass',
      severity,
      confidence: 'high',
      evidence: `Detected one primary CTA marker: ${evidenceList}.`,
      recommendation: 'No change needed for CTA priority.',
      correctionPrompt: 'Keep one dominant primary CTA and preserve hierarchy in all breakpoints.'
    };
  }

  if (count === 0) {
    return {
      ruleId: rule.ruleId,
      status: 'partial',
      severity,
      confidence: 'medium',
      evidence: 'No primary CTA marker was detected in the source.',
      recommendation: 'Add or mark the intended primary action so the decision path is explicit.',
      correctionPrompt:
        'Identify the one action users should take next and style it as the sole primary CTA.'
    };
  }

  return {
    ruleId: rule.ruleId,
    status: 'fail',
    severity,
    confidence: 'high',
    evidence: `Detected ${count} primary CTA markers: ${evidenceList}.`,
    recommendation: 'Retain exactly one primary CTA in the top-priority decision region.',
    correctionPrompt:
      'Keep one dominant primary CTA. Convert competing actions to secondary buttons, tertiary links, or progressive disclosure.'
  };
};

const evaluateColorRule = (
  rule: ValidatorRuleInput,
  outputContent: string,
  severity: ValidationFinding['severity']
): ValidationFinding => {
  const hardcodedColors = extractHardcodedColors(outputContent);

  if (hardcodedColors.length === 0) {
    return {
      ruleId: rule.ruleId,
      status: 'pass',
      severity,
      confidence: 'high',
      evidence: 'No hardcoded hex, rgb, rgba, hsl, or hsla colors detected in the output source.',
      recommendation: 'Continue using design-system tokens consistently.',
      correctionPrompt: 'Maintain token-based color usage for all new UI additions.'
    };
  }

  return {
    ruleId: rule.ruleId,
    status: 'partial',
    severity,
    confidence: 'high',
    evidence: `Detected ${hardcodedColors.length} hardcoded color value(s): ${summarize(hardcodedColors, 'none')}.`,
    recommendation: 'Replace hardcoded colors with approved semantic design tokens.',
    correctionPrompt:
      'Replace each hardcoded color literal with the nearest approved semantic token, then re-run validation.'
  };
};

const evaluateHeadingRule = (
  rule: ValidatorRuleInput,
  outputContent: string,
  severity: ValidationFinding['severity']
): ValidationFinding => {
  const levels = extractHeadingLevels(outputContent);
  const sequence = levels.map(level => `h${level}`).join(' -> ') || 'none';
  const h1Count = levels.filter(level => level === 1).length;
  const skipped = levels.some((level, index) => index > 0 && level - levels[index - 1]! > 1);

  if (levels.length === 0) {
    return {
      ruleId: rule.ruleId,
      status: 'fail',
      severity,
      confidence: 'high',
      evidence: 'No heading tags were detected in the output source.',
      recommendation: 'Add a clear heading structure so users and assistive tech can scan the screen.',
      correctionPrompt:
        'Add one screen-level h1 and organize sections with sequential h2/h3 headings.'
    };
  }

  if (h1Count !== 1 || skipped) {
    return {
      ruleId: rule.ruleId,
      status: 'partial',
      severity,
      confidence: 'high',
      evidence: `Detected heading sequence: ${sequence}. h1 count=${h1Count}.`,
      recommendation:
        'Use exactly one h1 and avoid skipped heading levels so the information hierarchy is explicit.',
      correctionPrompt:
        'Normalize heading levels to one h1 followed by sequential section headings without skipped levels.'
    };
  }

  return {
    ruleId: rule.ruleId,
    status: 'pass',
    severity,
    confidence: 'high',
    evidence: `Detected a sequential heading structure: ${sequence}.`,
    recommendation: 'No change needed for heading hierarchy.',
    correctionPrompt: 'Preserve the current heading sequence as the screen evolves.'
  };
};

const evaluateSemanticRule = (
  rule: ValidatorRuleInput,
  outputContent: string,
  severity: ValidationFinding['severity']
): ValidationFinding => {
  const missing: string[] = [];
  if (!hasMainLandmark(outputContent)) missing.push('main landmark');
  if (!hasNavigationLandmark(outputContent)) missing.push('navigation landmark');
  if (extractHeadingLevels(outputContent).length === 0) missing.push('headings');

  if (missing.length === 0) {
    return {
      ruleId: rule.ruleId,
      status: 'pass',
      severity,
      confidence: 'high',
      evidence: 'Detected main/navigation landmarks and heading tags in the output source.',
      recommendation: 'No change needed for semantic page structure.',
      correctionPrompt: 'Preserve semantic landmarks and heading structure while iterating.'
    };
  }

  return {
    ruleId: rule.ruleId,
    status: 'partial',
    severity,
    confidence: 'high',
    evidence: `Missing semantic structure evidence: ${missing.join(', ')}.`,
    recommendation: 'Add semantic landmarks and headings so the screen is easier to scan and navigate.',
    correctionPrompt:
      'Wrap primary content in main, expose navigation with nav or role navigation, and add meaningful headings.'
  };
};

const evaluateFormErrorRule = (
  rule: ValidatorRuleInput,
  outputContent: string,
  severity: ValidationFinding['severity']
): ValidationFinding => {
  if (!hasFormControl(outputContent)) {
    return {
      ruleId: rule.ruleId,
      status: 'unknown',
      severity,
      confidence: 'low',
      evidence: 'No form controls were detected in the output source.',
      recommendation: 'Validate this rule against a screen or state that contains form inputs.',
      correctionPrompt: 'Provide the form state or error-state source before final compliance judgment.'
    };
  }

  const hasErrorState = hasErrorStateEvidence(outputContent);
  const hasLabel = hasFieldLabel(outputContent);

  if (hasErrorState && hasLabel) {
    return {
      ruleId: rule.ruleId,
      status: 'pass',
      severity,
      confidence: 'high',
      evidence: 'Detected form controls with labels and error-state hooks such as aria/error attributes.',
      recommendation: 'No change needed for basic form error-state evidence.',
      correctionPrompt: 'Preserve accessible labels and error-state hooks for every invalid field.'
    };
  }

  if (hasErrorState) {
    return {
      ruleId: rule.ruleId,
      status: 'partial',
      severity,
      confidence: 'medium',
      evidence: 'Detected error-state hooks, but field label evidence is missing or unclear.',
      recommendation: 'Pair every field with a visible label or accessible label reference.',
      correctionPrompt:
        'Add label, aria-label, or aria-labelledby for each form control while preserving error-state hooks.'
    };
  }

  return {
    ruleId: rule.ruleId,
    status: 'fail',
    severity,
    confidence: 'high',
    evidence: 'Detected form controls but no aria-invalid, alert, described-by, error, or invalid state hooks.',
    recommendation: 'Add explicit, accessible error-state evidence for invalid fields.',
    correctionPrompt:
      'Add aria-invalid, aria-describedby, and visible error messaging for invalid inputs; expose urgent errors with role alert when appropriate.'
  };
};

export const evaluateCodeLikeRule = (
  rule: ValidatorRuleInput,
  outputType: string,
  outputContent: string | null
): ValidationFinding | null => {
  if (!outputContent || !CODE_OUTPUT_TYPES.has(outputType)) {
    return null;
  }

  const severity = severityFromPriority(rule.priority);
  const text = `${rule.validatorType} ${rule.ruleId} ${rule.statement}`.toLowerCase();

  if (text.includes('cta') || text.includes('primary')) {
    return evaluateCtaRule(rule, outputContent, severity);
  }

  if (text.includes('token') || text.includes('design system') || text.includes('color')) {
    return evaluateColorRule(rule, outputContent, severity);
  }

  if (/\bform\b/.test(text) || text.includes('error state') || text.includes('error-state')) {
    return evaluateFormErrorRule(rule, outputContent, severity);
  }

  if (
    text.includes('heading') ||
    text.includes('h1') ||
    text.includes('information architecture') ||
    text.includes('content architecture')
  ) {
    return evaluateHeadingRule(rule, outputContent, severity);
  }

  if (text.includes('semantic') || text.includes('landmark')) {
    return evaluateSemanticRule(rule, outputContent, severity);
  }

  return null;
};
