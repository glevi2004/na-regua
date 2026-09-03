/**
 * NUCLEO — casos de uso.
 *
 * Toda operacao de negocio vive aqui, com transacao, autorizacao e auditoria.
 * Recebe (deps, ExecutionContext, input) e nao sabe se a chamada veio do
 * aplicativo ou do WhatsApp. Tambem e aqui que as PORTAS dos adapters sao
 * declaradas. Ver docs/arquitetura/principios.md#1-core-e-o-nucleo
 *
 * A agenda (NR-034) e o primeiro caso de uso completo e serve de molde para os
 * proximos: porta declarada aqui, repositorio injetado, teste com implementacao
 * em memoria. Cadastros e venda vem com NR-021 e NR-022.
 */
export { AppError, isAppError } from './app-error.js'
export type { AppErrorCode, FieldIssue } from './app-error.js'

export { assertCanWrite } from './authorization.js'

export type { Channel, CompanyId, ExecutionContext, UseCase, UserId } from './context.js'

/* --- Portas: interfaces que db, worker e os adapters implementam --- */
export type { AppointmentRepository, NewAppointment } from './ports/appointment-repository.js'
export { camposAlterados } from './audit/changed-fields.js'
export type { Alteracao } from './audit/changed-fields.js'
export type { AuditTrail, NewAuditEntry, TransactionalAuditTrail } from './ports/audit-trail.js'
export { adjustStock } from './inventory/adjust-stock.js'
export type { AdjustStockDeps } from './inventory/adjust-stock.js'
export { checkStock, estaAbaixoDoMinimo } from './inventory/check-stock.js'
export type { CheckStockDeps } from './inventory/check-stock.js'
export type {
  InventoryProductSnapshot,
  InventoryQueries,
  InventoryReader,
  InventoryTransaction,
  InventoryUnitOfWork,
  NewInventoryMovement,
} from './ports/inventory-writers.js'
export type { InvoiceIssuer } from './ports/invoice-issuer.js'
export type {
  CompanyRepository,
  CustomerRepository,
  NewCompany,
  NewCustomer,
  NewProduct,
  ProductRepository,
} from './ports/registration-repositories.js'
export type {
  CompanySettingsRepository,
  NewReceivable,
  NewSale,
  NewSaleItem,
  NewSalePayment,
  RegisteredSale,
  SaleProductReader,
  SaleProductSnapshot,
  SaleSettings,
  SaleTransaction,
  UnitOfWork,
} from './ports/sale-writers.js'
export type { MessageSender } from './ports/message-sender.js'
export type { PaymentGateway } from './ports/payment-gateway.js'
export type { ReminderScheduler } from './ports/reminder-scheduler.js'

/* --- Venda — NR-022 --- */
export { registerSale } from './sales/register-sale.js'
export type { RegisterSaleDeps, RegisterSaleResult, StockWarning } from './sales/register-sale.js'

/* --- Cadastros — NR-021 --- */
export { registerCompany } from './registration/register-company.js'
export type { RegisterCompanyDeps } from './registration/register-company.js'
export { assertIdentifiable, registerCustomer } from './registration/register-customer.js'
export type {
  RegisterCustomerDeps,
  RegisterCustomerOptions,
  RegisterCustomerResult,
} from './registration/register-customer.js'
export {
  findProductByBarcode,
  generateInternalCode,
  registerProduct,
} from './registration/register-product.js'
export type { RegisterProductDeps } from './registration/register-product.js'

/* --- Agenda — NR-034 --- */
export { cancelAppointment } from './schedule/cancel-appointment.js'
export type { CancelAppointmentDeps } from './schedule/cancel-appointment.js'
export { createAppointment, reminderFireAt } from './schedule/create-appointment.js'
export type { CreateAppointmentDeps } from './schedule/create-appointment.js'
export { listDayAppointments } from './schedule/list-day-appointments.js'
export type { DayAgenda, ListDayAppointmentsDeps } from './schedule/list-day-appointments.js'
