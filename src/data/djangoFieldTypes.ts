export interface FieldTypeInfo {
    name: string;
    lookups: string[];
    description: string;
}

// Common lookups available for all field types
export const COMMON_LOOKUPS = [
    'exact', 
    'iexact', 
    'contains', 
    'icontains', 
    'in', 
    'gt', 
    'gte', 
    'lt', 
    'lte', 
    'isnull'
];

// Field-specific lookups
export const FIELD_TYPE_LOOKUPS: { [key: string]: string[] } = {
    ['CharField']: ['startswith', 'istartswith', 'endswith', 'iendswith', 'regex', 'iregex'],
    ['TextField']: ['startswith', 'istartswith', 'endswith', 'iendswith', 'regex', 'iregex'],
    ['IntegerField']: ['range'],
    ['FloatField']: ['range'],
    ['DecimalField']: ['range'],
    ['DateField']: ['year', 'month', 'day', 'week', 'week_day', 'quarter', 'range'],
    ['DateTimeField']: ['year', 'month', 'day', 'week', 'week_day', 'quarter', 'hour', 'minute', 'second', 'range', 'date', 'time'],
    ['TimeField']: ['hour', 'minute', 'second', 'range'],
    ['ForeignKey']: ['exact', 'in', 'isnull'],
    ['ManyToManyField']: ['exact', 'in'],
};

// Django field types with their properties
export const DJANGO_FIELD_TYPES: FieldTypeInfo[] = [
    // String fields
    { name: 'CharField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['CharField']], description: 'A string field, for small- to large-sized strings' },
    { name: 'TextField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['TextField']], description: 'A large text field' },
    { name: 'SlugField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['CharField']], description: 'A CharField that validates against letters, numbers, underscores, and hyphens' },
    { name: 'EmailField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['CharField']], description: 'A CharField that checks that the value is a valid email address' },
    { name: 'URLField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['CharField']], description: 'A CharField for a URL' },
    
    // Numeric fields
    { name: 'IntegerField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['IntegerField']], description: 'An integer field' },
    { name: 'BigIntegerField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['IntegerField']], description: 'A 64-bit integer field' },
    { name: 'SmallIntegerField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['IntegerField']], description: 'A small integer field' },
    { name: 'PositiveIntegerField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['IntegerField']], description: 'An integer field that must be positive' },
    { name: 'FloatField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['FloatField']], description: 'A floating-point number represented in Python by a float instance' },
    { name: 'DecimalField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['DecimalField']], description: 'A fixed-precision decimal number' },
    
    // Boolean fields
    { name: 'BooleanField', lookups: COMMON_LOOKUPS, description: 'A true/false field' },
    { name: 'NullBooleanField', lookups: COMMON_LOOKUPS, description: 'A field that allows NULL, True, and False values' },
    
    // Date and time fields
    { name: 'DateField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['DateField']], description: 'A date, represented in Python by a datetime.date instance' },
    { name: 'DateTimeField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['DateTimeField']], description: 'A date and time, represented in Python by a datetime.datetime instance' },
    { name: 'TimeField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['TimeField']], description: 'A time, represented in Python by a datetime.time instance' },
    { name: 'DurationField', lookups: [...COMMON_LOOKUPS, 'range'], description: 'A field for storing periods of time' },
    
    // Relationship fields
    { name: 'ForeignKey', lookups: FIELD_TYPE_LOOKUPS['ForeignKey'], description: 'A many-to-one relationship' },
    { name: 'ManyToManyField', lookups: FIELD_TYPE_LOOKUPS['ManyToManyField'], description: 'A many-to-many relationship' },
    { name: 'OneToOneField', lookups: FIELD_TYPE_LOOKUPS['ForeignKey'], description: 'A one-to-one relationship' },
    
    // File fields
    { name: 'FileField', lookups: COMMON_LOOKUPS, description: 'A file-upload field' },
    { name: 'ImageField', lookups: COMMON_LOOKUPS, description: 'An image file field' },
    { name: 'FilePathField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['CharField']], description: 'A CharField whose choices are limited to the filenames in a certain directory' },
    
    // Other fields
    { name: 'JSONField', lookups: [...COMMON_LOOKUPS, 'has_key', 'has_keys', 'has_any_keys', 'contained_by', 'contains'], description: 'A field for storing JSON encoded data' },
    { name: 'UUIDField', lookups: COMMON_LOOKUPS, description: 'A field for storing universally unique identifiers' },
    { name: 'GenericIPAddressField', lookups: [...COMMON_LOOKUPS, ...FIELD_TYPE_LOOKUPS['CharField']], description: 'An IPv4 or IPv6 address' },
    { name: 'BinaryField', lookups: COMMON_LOOKUPS, description: 'A field to store raw binary data' },
];

// Helper function to get lookups for a field type
export function getFieldLookups(fieldType: string): string[] {
    const fieldInfo = DJANGO_FIELD_TYPES.find(f => f.name === fieldType);
    return fieldInfo ? fieldInfo.lookups : COMMON_LOOKUPS;
}