import { cva, type VariantProps } from 'class-variance-authority';

export const alertVariants = cva(
  'relative flex gap-3 w-full rounded-md px-3.5 py-3',
  {
    variants: {
      zType: {
        default: 'dark:data-[appearance="soft"]:text-zinc-800 data-[appearance="fill"]:text-white',
        info: 'text-blue-500 data-[appearance="fill"]:text-white',
        success: 'text-[#48cb89] data-[appearance="fill"]:text-[#48cb89]',
        warning: 'text-yellow-600 data-[appearance="fill"]:text-white',
        error: 'text-[#ff9ea1] data-[appearance="fill"]:text-[#ff9ea1]',
        confirm: 'text-[#a855f7] data-[appearance="fill"]:text-white',
      },
      zAppearance: {
        outline: 'border data-[type="info"]:border-blue-500 data-[type="success"]:border-[#48cb89] data-[type="warning"]:border-yellow-600 data-[type="error"]:border-[#ff9ea1]' ,
        soft: 'bg-zinc-100 data-[type="info"]:bg-blue-50 data-[type="success"]:bg-green-50 data-[type="warning"]:bg-yellow-50 data-[type="error"]:bg-red-50',
        fill: 'bg-zinc-500 data-[type="info"]:bg-blue-500 data-[type="success"]:bg-[#001f0f] data-[type="warning"]:bg-yellow-600 data-[type="error"]:bg-[#2d0607]  data-[type="confirm"]:bg-[#BA8DF5]',
      },
    },
    defaultVariants: {
      zType: 'default',
      zAppearance: 'outline',
    },
  }
);

export type ZardAlertVariants = VariantProps<typeof alertVariants>;