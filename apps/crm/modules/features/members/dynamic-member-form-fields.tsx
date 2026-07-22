"use client";

/**
 * Совместимость: динамические поля формы member теперь рендерятся через
 * общий пакет @workspace/dynamic-forms. Оставлен реэкспорт, чтобы не ломать
 * существующие импорты.
 */
export { DynamicFormFields as DynamicMemberFormFields } from "@workspace/dynamic-forms";
export type { MemberFormSchemaField } from "@/modules/entities/member/model/member-form-schema-field";
