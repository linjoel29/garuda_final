"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delaySimulationSchema = exports.disruptionTypeEnum = exports.routeGenerateSchema = exports.optimizationObjectiveEnum = exports.vehicleUpdateSchema = exports.vehicleSchema = exports.vehicleTypeEnum = exports.orderUpdateSchema = exports.orderSchema = exports.orderStatusEnum = exports.orderCategoryEnum = exports.orderPriorityEnum = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// --- Auth Schemas ---
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    name: zod_1.z.string().min(2, 'Name is required'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// --- Order Schemas ---
exports.orderPriorityEnum = zod_1.z.enum(['standard', 'urgent']);
exports.orderCategoryEnum = zod_1.z.enum(['Standard', 'Fragile', 'Refrigerated', 'Urgent']);
exports.orderStatusEnum = zod_1.z.enum(['pending', 'assigned', 'delivered', 'delayed']);
exports.orderSchema = zod_1.z.object({
    recipient_name: zod_1.z.string().min(1, 'Recipient name is required'),
    address: zod_1.z.string().min(3, 'Address is required'),
    lat: zod_1.z.number().optional().nullable(),
    lng: zod_1.z.number().optional().nullable(),
    weight_kg: zod_1.z.number().positive('Weight must be greater than 0'),
    volume_m3: zod_1.z.number().nonnegative('Volume cannot be negative').optional().nullable(),
    priority: exports.orderPriorityEnum.default('standard'),
    category: exports.orderCategoryEnum.optional().default('Standard'),
    time_window_start: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
    time_window_end: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
    special_instructions: zod_1.z.string().optional().nullable(),
});
exports.orderUpdateSchema = exports.orderSchema.partial().extend({
    status: exports.orderStatusEnum.optional(),
});
// --- Vehicle Schemas ---
exports.vehicleTypeEnum = zod_1.z.enum(['Bike', 'Van', 'Truck']);
exports.vehicleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Vehicle name or ID is required'),
    vehicle_type: exports.vehicleTypeEnum.default('Van'),
    max_weight_kg: zod_1.z.number().positive('Max weight must be greater than 0'),
    max_volume_m3: zod_1.z.number().nonnegative('Max volume cannot be negative').optional().nullable(),
    depot_lat: zod_1.z.number().min(-90).max(90, 'Invalid latitude'),
    depot_lng: zod_1.z.number().min(-180).max(180, 'Invalid longitude'),
    depot_address: zod_1.z.string().optional().nullable(),
    is_active: zod_1.z.boolean().default(true),
});
exports.vehicleUpdateSchema = exports.vehicleSchema.partial();
// --- Route Generation Schemas ---
exports.optimizationObjectiveEnum = zod_1.z.enum(['minimize_time', 'minimize_distance', 'balance_load']);
exports.routeGenerateSchema = zod_1.z.object({
    route_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    order_ids: zod_1.z.array(zod_1.z.string().uuid('Invalid order ID')).min(1, 'Select at least one order'),
    vehicle_ids: zod_1.z.array(zod_1.z.string().uuid('Invalid vehicle ID')).min(1, 'Select at least one vehicle'),
    objective: exports.optimizationObjectiveEnum.default('minimize_time'),
});
// --- Delay Simulation Schemas ---
exports.disruptionTypeEnum = zod_1.z.enum(['delay', 'closure', 'breakdown', 'extended_stop']);
exports.delaySimulationSchema = zod_1.z.object({
    stop_id: zod_1.z.string().uuid('Invalid stop ID'),
    event_type: exports.disruptionTypeEnum,
    delay_minutes: zod_1.z.number().min(0).default(15),
    notes: zod_1.z.string().optional().nullable(),
});
