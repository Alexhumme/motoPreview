from django.db import models


class PostgreSQLEnumField(models.CharField):
    """CharField adapter that binds values using the existing PostgreSQL enum type."""

    def __init__(self, *args, enum_type, **kwargs):
        self.enum_type = enum_type
        super().__init__(*args, **kwargs)

    def db_type(self, connection):
        if connection.vendor == "postgresql":
            return self.enum_type
        return super().db_type(connection)

    def get_placeholder(self, value, compiler, connection):
        if connection.vendor == "postgresql":
            return f"%s::{connection.ops.quote_name(self.enum_type)}"
        return super().get_placeholder(value, compiler, connection)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["enum_type"] = self.enum_type
        return name, path, args, kwargs
