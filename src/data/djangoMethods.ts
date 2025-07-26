export interface DjangoMethod {
    name: string;
    signature: string;
    doc: string;
    chainable: boolean;
}

export const DJANGO_QUERYSET_METHODS: DjangoMethod[] = [
    // Queryset methods that return querysets
    { name: 'all', signature: '() -> QuerySet', doc: 'Returns a copy of the current QuerySet', chainable: true },
    { name: 'filter', signature: '(**kwargs) -> QuerySet', doc: 'Returns a new QuerySet containing objects that match the given lookup parameters', chainable: true },
    { name: 'exclude', signature: '(**kwargs) -> QuerySet', doc: 'Returns a new QuerySet containing objects that do not match the given lookup parameters', chainable: true },
    { name: 'annotate', signature: '(**kwargs) -> QuerySet', doc: 'Returns a QuerySet where each object has been annotated with the specified values', chainable: true },
    { name: 'order_by', signature: '(*fields) -> QuerySet', doc: 'Returns a QuerySet ordered by the given fields', chainable: true },
    { name: 'reverse', signature: '() -> QuerySet', doc: 'Reverses the ordering of the QuerySet', chainable: true },
    { name: 'distinct', signature: '(*fields) -> QuerySet', doc: 'Returns a new QuerySet that uses SELECT DISTINCT', chainable: true },
    { name: 'values', signature: '(*fields) -> QuerySet', doc: 'Returns a QuerySet that returns dictionaries when used as an iterable', chainable: true },
    { name: 'values_list', signature: '(*fields, flat=False, named=False) -> QuerySet', doc: 'Returns a QuerySet that returns tuples when used as an iterable', chainable: true },
    { name: 'dates', signature: '(field, kind, order="ASC") -> QuerySet', doc: 'Returns a QuerySet that evaluates to a list of datetime.date objects', chainable: true },
    { name: 'datetimes', signature: '(field, kind, order="ASC", tzinfo=None) -> QuerySet', doc: 'Returns a QuerySet that evaluates to a list of datetime.datetime objects', chainable: true },
    { name: 'none', signature: '() -> QuerySet', doc: 'Returns an empty QuerySet', chainable: true },
    { name: 'union', signature: '(*other_qs, all=False) -> QuerySet', doc: 'Uses SQL\'s UNION operator to combine the results of two or more QuerySets', chainable: true },
    { name: 'intersection', signature: '(*other_qs) -> QuerySet', doc: 'Uses SQL\'s INTERSECT operator to return the shared elements of two or more QuerySets', chainable: true },
    { name: 'difference', signature: '(*other_qs) -> QuerySet', doc: 'Uses SQL\'s EXCEPT operator to keep only elements present in the QuerySet but not in some other QuerySets', chainable: true },
    { name: 'select_related', signature: '(*fields) -> QuerySet', doc: 'Returns a QuerySet that will "follow" foreign-key relationships', chainable: true },
    { name: 'prefetch_related', signature: '(*lookups) -> QuerySet', doc: 'Returns a QuerySet that will automatically retrieve related objects', chainable: true },
    { name: 'extra', signature: '(select=None, where=None, params=None, tables=None, order_by=None, select_params=None) -> QuerySet', doc: 'Sometimes, the Django query syntax by itself can\'t express a complex WHERE clause', chainable: true },
    { name: 'defer', signature: '(*fields) -> QuerySet', doc: 'Tells Django not to retrieve specific fields from the database', chainable: true },
    { name: 'only', signature: '(*fields) -> QuerySet', doc: 'The opposite of defer() - only the specified fields are loaded immediately', chainable: true },
    { name: 'using', signature: '(alias) -> QuerySet', doc: 'Specifies which database the QuerySet should be evaluated against', chainable: true },
    { name: 'select_for_update', signature: '(nowait=False, skip_locked=False, of=()) -> QuerySet', doc: 'Returns a queryset that will lock rows until the end of the transaction', chainable: true },
    { name: 'raw', signature: '(raw_query, params=None, translations=None, using=None) -> RawQuerySet', doc: 'Performs a raw SQL query and returns a RawQuerySet instance', chainable: false },
    
    // Methods that return single objects
    { name: 'get', signature: '(**kwargs) -> Model', doc: 'Returns the object matching the given lookup parameters', chainable: false },
    { name: 'first', signature: '() -> Model | None', doc: 'Returns the first object matched by the queryset', chainable: false },
    { name: 'last', signature: '() -> Model | None', doc: 'Returns the last object matched by the queryset', chainable: false },
    { name: 'latest', signature: '(*fields) -> Model', doc: 'Returns the latest object in the table based on the given field(s)', chainable: false },
    { name: 'earliest', signature: '(*fields) -> Model', doc: 'Returns the earliest object in the table based on the given field(s)', chainable: false },
    
    // Methods that return other types
    { name: 'exists', signature: '() -> bool', doc: 'Returns True if the QuerySet contains any results', chainable: false },
    { name: 'count', signature: '() -> int', doc: 'Returns an integer representing the number of objects in the QuerySet', chainable: false },
    { name: 'aggregate', signature: '(**kwargs) -> dict', doc: 'Returns a dictionary of aggregate values calculated over the QuerySet', chainable: false },
    { name: 'get_or_create', signature: '(defaults=None, **kwargs) -> (Model, bool)', doc: 'Returns a tuple of (object, created)', chainable: false },
    { name: 'update_or_create', signature: '(defaults=None, **kwargs) -> (Model, bool)', doc: 'Updates an object with the given kwargs, creating a new one if necessary', chainable: false },
    { name: 'bulk_create', signature: '(objs, batch_size=None, ignore_conflicts=False) -> list', doc: 'Inserts the provided list of objects into the database', chainable: false },
    { name: 'bulk_update', signature: '(objs, fields, batch_size=None) -> None', doc: 'Updates the given fields on the provided model instances', chainable: false },
    { name: 'in_bulk', signature: '(id_list=None, *, field_name="pk") -> dict', doc: 'Returns a dictionary mapping the values of field_name to model instances', chainable: false },
    { name: 'iterator', signature: '(chunk_size=2000) -> Iterator', doc: 'Evaluates the QuerySet and returns an iterator over the results', chainable: false },
    { name: 'explain', signature: '(*, format=None, **options) -> str', doc: 'Returns the execution plan of the QuerySet\'s query', chainable: false },
    
    // Deletion and update
    { name: 'delete', signature: '() -> (int, dict)', doc: 'Deletes the objects in the current QuerySet', chainable: false },
    { name: 'update', signature: '(**kwargs) -> int', doc: 'Updates all objects in the QuerySet', chainable: false },
    
    // Manager methods
    { name: 'create', signature: '(**kwargs) -> Model', doc: 'Creates an object and saves it all in one step', chainable: false },
];

export const DJANGO_MODEL_METHODS: DjangoMethod[] = [
    {
        name: 'save',
        signature: '(force_insert=False, force_update=False, using=DEFAULT_DB_ALIAS, update_fields=None)',
        doc: 'Saves the current instance',
        chainable: false
    },
    {
        name: 'delete',
        signature: '(using=DEFAULT_DB_ALIAS, keep_parents=False)',
        doc: 'Deletes the current instance',
        chainable: false
    },
    {
        name: 'get_absolute_url',
        signature: '()',
        doc: 'Returns the canonical URL for an object',
        chainable: false
    },
    {
        name: 'clean',
        signature: '()',
        doc: 'Performs model validation',
        chainable: false
    },
    {
        name: 'full_clean',
        signature: '(exclude=None, validate_unique=True)',
        doc: 'Calls clean_fields(), clean(), and validate_unique()',
        chainable: false
    }
];

export const DJANGO_MODEL_PROPERTIES = ['pk', 'id'];