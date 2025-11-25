"""
Base serializer classes and mixins.

This module provides reusable serializer components to eliminate
duplicated serializer patterns across the codebase.
"""

from rest_framework import serializers
from typing import Optional, Any, List, Set


class UserNameSerializerMixin:
    """
    Mixin providing user name field methods.

    Eliminates the duplicated pattern of getting user full names
    that appears 15+ times across the codebase.

    Usage:
        class MySerializer(UserNameSerializerMixin, serializers.ModelSerializer):
            requester_name = serializers.SerializerMethodField()
            approved_by_name = serializers.SerializerMethodField()

            # The mixin provides get_requester_name, get_approved_by_name, etc.
    """

    def get_user_display_name(self, user) -> str:
        """
        Get display name for a user.

        Returns full name if available, otherwise username.

        Args:
            user: User instance or None

        Returns:
            User's display name or "Unknown"
        """
        if not user:
            return "Unknown"

        # Use full_name property if available (from our User model)
        if hasattr(user, 'full_name'):
            return user.full_name

        # Fallback for standard Django User
        if user.first_name and user.last_name:
            return f"{user.first_name} {user.last_name}"
        elif user.first_name:
            return user.first_name

        return user.username

    def get_requester_name(self, obj) -> str:
        """Get display name for requester"""
        return self.get_user_display_name(getattr(obj, 'requester', None))

    def get_approved_by_name(self, obj) -> str:
        """Get display name for approver"""
        return self.get_user_display_name(getattr(obj, 'approved_by', None))

    def get_approved_l1_by_name(self, obj) -> str:
        """Get display name for L1 approver"""
        return self.get_user_display_name(getattr(obj, 'approved_l1_by', None))

    def get_approved_l2_by_name(self, obj) -> str:
        """Get display name for L2 approver"""
        return self.get_user_display_name(getattr(obj, 'approved_l2_by', None))

    def get_rejected_by_name(self, obj) -> str:
        """Get display name for rejector"""
        return self.get_user_display_name(getattr(obj, 'rejected_by', None))

    def get_uploaded_by_name(self, obj) -> str:
        """Get display name for uploader"""
        return self.get_user_display_name(getattr(obj, 'uploaded_by', None))

    def get_validated_by_name(self, obj) -> str:
        """Get display name for validator"""
        return self.get_user_display_name(getattr(obj, 'validated_by', None))

    def get_created_by_name(self, obj) -> str:
        """Get display name for creator"""
        return self.get_user_display_name(getattr(obj, 'created_by', None))

    def get_updated_by_name(self, obj) -> str:
        """Get display name for updater"""
        return self.get_user_display_name(getattr(obj, 'updated_by', None))

    def get_user_name(self, obj) -> str:
        """Get display name for user field"""
        return self.get_user_display_name(getattr(obj, 'user', None))


class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    """
    A ModelSerializer that supports dynamic field inclusion/exclusion.

    Allows callers to specify which fields to include or exclude at runtime,
    eliminating the need for separate List and Detail serializers.

    Usage:
        # In view
        serializer = MySerializer(obj, fields=['id', 'name', 'status'])
        serializer = MySerializer(obj, exclude=['large_field', 'internal_field'])

        # Or in serializer context
        serializer = MySerializer(obj, context={'fields': ['id', 'name']})
    """

    def __init__(self, *args, **kwargs):
        # Get fields/exclude from kwargs or context
        fields = kwargs.pop('fields', None)
        exclude = kwargs.pop('exclude', None)

        super().__init__(*args, **kwargs)

        # Also check context for fields/exclude
        if fields is None and self.context:
            fields = self.context.get('fields')
        if exclude is None and self.context:
            exclude = self.context.get('exclude')

        if fields is not None:
            # Keep only specified fields
            allowed: Set[str] = set(fields)
            existing: Set[str] = set(self.fields.keys())
            for field_name in existing - allowed:
                self.fields.pop(field_name)

        if exclude is not None:
            # Remove excluded fields
            for field_name in exclude:
                self.fields.pop(field_name, None)


class BaseModelSerializer(UserNameSerializerMixin, DynamicFieldsModelSerializer):
    """
    Base serializer combining common mixins.

    Provides:
    - User name methods
    - Dynamic field selection
    - Common utility methods

    Usage:
        class PurchaseRequestSerializer(BaseModelSerializer):
            requester_name = serializers.SerializerMethodField()

            class Meta:
                model = PurchaseRequest
                fields = '__all__'
    """

    def get_model_name(self) -> str:
        """Get the model name for error messages"""
        if hasattr(self, 'Meta') and hasattr(self.Meta, 'model'):
            return self.Meta.model.__name__
        return 'Object'


class ReadOnlyModelSerializer(BaseModelSerializer):
    """
    Base serializer for read-only operations.

    All fields are automatically set to read-only.
    Useful for list views and detail views that don't allow updates.
    """

    def get_fields(self):
        fields = super().get_fields()
        for field in fields.values():
            field.read_only = True
        return fields


class TimestampedModelSerializer(BaseModelSerializer):
    """
    Base serializer with formatted timestamp fields.

    Adds created_at_formatted and updated_at_formatted fields
    with human-readable date/time formatting.
    """

    created_at_formatted = serializers.SerializerMethodField()
    updated_at_formatted = serializers.SerializerMethodField()

    def get_created_at_formatted(self, obj) -> Optional[str]:
        """Get formatted created_at timestamp"""
        created_at = getattr(obj, 'created_at', None)
        if created_at:
            return created_at.strftime('%Y-%m-%d %H:%M:%S')
        return None

    def get_updated_at_formatted(self, obj) -> Optional[str]:
        """Get formatted updated_at timestamp"""
        updated_at = getattr(obj, 'updated_at', None)
        if updated_at:
            return updated_at.strftime('%Y-%m-%d %H:%M:%S')
        return None


class NestedCreateUpdateMixin:
    """
    Mixin for handling nested object creation/updates.

    Useful for serializers with nested writable relationships.

    Usage:
        class OrderSerializer(NestedCreateUpdateMixin, BaseModelSerializer):
            items = OrderItemSerializer(many=True)

            class Meta:
                model = Order
                fields = ['id', 'items']

            def create(self, validated_data):
                items_data = validated_data.pop('items', [])
                order = Order.objects.create(**validated_data)
                self.create_nested_items(order, items_data, OrderItem, 'order')
                return order
    """

    def create_nested_items(
        self,
        parent_instance,
        items_data: List[dict],
        item_model,
        parent_field_name: str
    ) -> List[Any]:
        """
        Create nested items for a parent instance.

        Args:
            parent_instance: The parent model instance
            items_data: List of item data dictionaries
            item_model: The item model class
            parent_field_name: Name of the ForeignKey field on item model

        Returns:
            List of created item instances
        """
        created_items = []
        for item_data in items_data:
            item_data[parent_field_name] = parent_instance
            item = item_model.objects.create(**item_data)
            created_items.append(item)
        return created_items

    def update_nested_items(
        self,
        parent_instance,
        items_data: List[dict],
        item_model,
        parent_field_name: str,
        item_id_field: str = 'id'
    ) -> List[Any]:
        """
        Update nested items for a parent instance.

        Creates new items, updates existing items, and deletes removed items.

        Args:
            parent_instance: The parent model instance
            items_data: List of item data dictionaries
            item_model: The item model class
            parent_field_name: Name of the ForeignKey field on item model
            item_id_field: Name of the ID field for identifying existing items

        Returns:
            List of created/updated item instances
        """
def update_nested_items(
    self,
    parent_instance,
    items_data: List[dict],
    item_model,
    parent_field_name: str,
    item_id_field: str = 'id',
    related_name: str = None
) -> List[Any]:
    # ... (earlier code)
    
    # Get existing items
    related_name = related_name or f'{parent_field_name}s'
    
    # Validate that the related_name attribute exists
    if not hasattr(parent_instance, related_name):
        parent_class = parent_instance.__class__.__name__
        default_hint = f"{item_model.__name__.lower()}_set"
        raise AttributeError(
            f"'{parent_class}' object has no attribute '{related_name}'. "
            f"The related_name is invalid. "
            f"Expected default would be '{default_hint}' if no related_name is set on the ForeignKey. "
            f"Check the ForeignKey definition on {item_model.__name__} or provide correct related_name parameter."
        )
    
    # Validate that the attribute is a related manager
    try:
        related_manager = getattr(parent_instance, related_name)
        existing_items = {
            getattr(item, item_id_field): item
            for item in related_manager.all()
        }
    except AttributeError as e:
        parent_class = parent_instance.__class__.__name__
        raise AttributeError(
            f"Attribute '{related_name}' on '{parent_class}' is not a related manager or is not accessible. "
            f"Ensure '{related_name}' is a reverse ForeignKey relation. "
            f"Original error: {str(e)}"
        ) from e
    except TypeError as e:
        parent_class = parent_instance.__class__.__name__
        attr_type = type(getattr(parent_instance, related_name)).__name__
        raise TypeError(
            f"Attribute '{related_name}' on '{parent_class}' (type: {attr_type}) does not support .all() method. "
            f"Expected a Django related manager, but got {attr_type}. "
            f"Original error: {str(e)}"
        ) from e

        updated_items = []
        seen_ids = set()

        for item_data in items_data:
            item_id = item_data.pop(item_id_field, None)

            if item_id and item_id in existing_items:
                # Update existing item
                item = existing_items[item_id]
                for key, value in item_data.items():
                    setattr(item, key, value)
                item.save()
                updated_items.append(item)
                seen_ids.add(item_id)
            else:
                # Create new item
                item_data[parent_field_name] = parent_instance
                item = item_model.objects.create(**item_data)
                updated_items.append(item)

        # Delete items that weren't in the update
        for item_id, item in existing_items.items():
            if item_id not in seen_ids:
                item.delete()

        return updated_items
