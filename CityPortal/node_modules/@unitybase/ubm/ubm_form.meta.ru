{
    "caption": "Форма",
    "description": "Определение интерфейсных форм",
    "attributes": {
        "code": {
            "caption": "Код формы",
            "description": ""
        },
        "description": {
            "caption": "Описание"
        },
        "caption": {
            "caption": "Заголовок формы"
        },
        "formType": {
            "caption": "Тип формы",
            "description": "Тип определения формы auto или custom"
        },
        "formDef": {
            "caption": "Определение формы",
            "description": "Определение интерфейса формы"
        },
        "formCode": {
            "caption": "Скрипт формы",
            "description": "JS с клиентской логикой формы"
        },
	"model": {
	  "caption": "Модель",
	  "description": "Модель куда сохранять",
	  "documentation": "Модель куда сохраняется форма. Если не заполнено - модель сущности. Использовать для описания форма для сущностей из чужих моделей"
	},
        "entity": {
            "caption": "Сущность",
            "description": "Код сущности",
            "documentation": "Используется при автоопределении формы для сущности"
        },
        "isDefault": {
            "caption": "По умолчанию",
            "description": "Использовать по умолчанию",
            "documentation": "При вызове команды showForm если не передан код формы будет произведён поиск формы по entity, и если таких несколько - взята та, у которой isDefault=true"
        }
    }
}