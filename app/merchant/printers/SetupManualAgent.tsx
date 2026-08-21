// On-page standalone print-agent manual shown on the merchant "My printers"
// page. The simplest print-station option: one Node.js script
// (agent/print-agent.mjs) polls the cloud for queued jobs — no n8n, no ngrok,
// no Telegram bot, no public URL. Mirrors agent/README.md in Mongolian.

import { Cmd, Step } from "./SetupManual";

export default function SetupManualAgent() {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Standalone скрипт суулгах заавар (хамгийн хялбар зам)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Нэг жижиг Node.js скрипт (<code>print-agent.mjs</code>) дэлгүүрийн
        компьютер дээр ажиллаж, үүлэн систем рүү 5 секунд тутам{" "}
        <strong>өөрөө холбогдож</strong> хэвлэх ажил байгаа эсэхийг шалгана.
        Тиймээс <strong>ngrok, n8n, Telegram бот огт хэрэггүй</strong> — доорх
        n8n заавруудын хялбар хувилбар нь энэ. Ойролцоогоор{" "}
        <strong>10–15 минут</strong> зарцуулна.
      </p>

      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Урьдчилан бэлдэх:</strong> ажлын цагаар асаалттай байдаг
        компьютер (Windows/Linux/macOS аль нь ч болно), суулгасан принтер,
        интернэт, болон <code>print-agent.mjs</code> файл ба{" "}
        <strong>AGENT_TOKEN</strong> нууц түлхүүр (хоёуланг нь Үүлэн Хэвлэл
        админаас авна).
      </div>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Дэлгэрэнгүй гарын авлага (англи): төслийн <code>agent/README.md</code>.
      </div>

      {/* How it works */}
      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
        <div className="font-medium text-slate-700 mb-1">Хэрхэн ажилладаг вэ</div>
        Хэрэглэгч төлбөр төлж файлаа илгээхдээ <strong>«Local agent»</strong>{" "}
        аргыг сонгоно → ажил үүлэн системд дараалалд орно → таны компьютер
        дээрх скрипт 5 секунд тутам «надад ажил байна уу?» гэж асууж, шинэ
        ажлыг татан авч принтерт хэвлээд «хэвлэсэн/алдаа» гэж буцааж
        мэдэгдэнэ. Алдаа гарвал хэрэглэгчид автоматаар буцаан төлөлт хийгдэнэ.
        Скрипт зөвхөн <strong>гадагш</strong> холбогддог тул нийтийн хаяг,
        порт нээх шаардлагагүй.
      </div>

      <div className="mt-4 space-y-2">
        <Step n="1" title="Node.js суулгах (v18+)" defaultOpen>
          <p>
            Скрипт Node.js дээр ажиллана — <strong>v18 буюу түүнээс дээш</strong>{" "}
            хангалттай.{" "}
            <a
              className="text-brand-600 underline"
              href="https://nodejs.org/en/download"
              target="_blank"
              rel="noreferrer"
            >
              nodejs.org
            </a>
            -оос LTS хувилбарыг суулгаад шинэ терминал/PowerShell цонхонд шалга:
          </p>
          <Cmd>node --version</Cmd>
          <p>
            <code>v18.x</code> буюу дээш гарвал OK. (n8n заавраар аль хэдийн
            v20+ суулгасан бол энэ алхмыг алгас.)
          </p>
        </Step>

        <Step n="2" title="Принтерийн нэрийг олох (OS_PRINTER)">
          <p>
            Принтерийн нэрийг <strong>үйлдлийн систем яаж хардгаар нь</strong>{" "}
            яг таг хуулж тэмдэглэ:
          </p>
          <p>
            <strong>Windows</strong> (PowerShell):
          </p>
          <Cmd>Get-Printer | Select-Object Name</Cmd>
          <p>
            Ж: <code>HP LaserJet 1020</code> (том/жижиг үсэг, зай хамаатай).
          </p>
          <p>
            <strong>Linux / macOS:</strong>
          </p>
          <Cmd>lpstat -p</Cmd>
          <p>
            Ж: <code>HP_LaserJet_1020</code> (CUPS нэрэнд зай байдаггүй).
          </p>
        </Step>

        <Step n="3" title="Windows бол: SumatraPDF суулгах">
          <p>
            <strong>Зөвхөн Windows дээр</strong> хэрэгтэй — PDF-ийг командын
            мөрөөс хэвлэдэг жижиг үнэгүй програм.{" "}
            <a
              className="text-brand-600 underline"
              href="https://www.sumatrapdfreader.org/download-free-pdf-viewer"
              target="_blank"
              rel="noreferrer"
            >
              Эндээс
            </a>{" "}
            (64-bit) татаж суулгаад <code>SumatraPDF.exe</code>-ийн замыг
            тэмдэглэ (ихэвчлэн{" "}
            <code>C:\Users\&lt;нэр&gt;\AppData\Local\SumatraPDF\SumatraPDF.exe</code>
            ). Linux/macOS дээр юу ч суулгах хэрэггүй — CUPS-ийн{" "}
            <code>lp</code> команд ашиглана.
          </p>
        </Step>

        <Step n="4" title="PRINTER_ID болон AGENT_TOKEN бэлдэх">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>PRINTER_ID</strong> — энэ хуудсан дээрх принтерийн карт
              дээр <code>PRINTER_ID</code> гэж бичсэн <strong>Хуулах</strong>{" "}
              товчтой код бий — түүнийг хуул (<code>c…</code>-ээр эхэлсэн урт
              тэмдэгт мөр). Нэг компьютерээс хэд хэдэн принтер хэвлэдэг бол
              ID-нуудыг таслалаар залгаж болно.
            </li>
            <li>
              <strong>AGENT_TOKEN</strong> — серверийн нууц түлхүүр. Үүлэн
              Хэвлэл админаас авна; нууц үг шиг хадгал, хэнтэй ч бүү хуваалц.
            </li>
            <li>
              <code>print-agent.mjs</code> файлыг админаас авч компьютертээ
              хуул (ж: гэрийн фолдер эсвэл <code>C:\uulen-print</code>).
            </li>
          </ul>
        </Step>

        <Step n="5" title="Скриптийг ажиллуулах">
          <p>
            <strong>Linux / macOS</strong> (нэг мөр, өөрийн утгуудаар солино):
          </p>
          <Cmd>{`APP_URL="https://uulen.xyz" \\
AGENT_TOKEN="admin-аас_авсан_токен" \\
PRINTER_ID="cxxxxxxxxxxxxxxxxxxxxxxxx" \\
OS_PRINTER="HP_LaserJet_1020" \\
node print-agent.mjs`}</Cmd>
          <p>
            <strong>Windows</strong> (PowerShell):
          </p>
          <Cmd>{`$env:APP_URL="https://uulen.xyz"
$env:AGENT_TOKEN="admin-аас_авсан_токен"
$env:PRINTER_ID="cxxxxxxxxxxxxxxxxxxxxxxxx"
$env:OS_PRINTER="HP LaserJet 1020"
$env:SUMATRA_PATH="C:\\Users\\НЭР\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe"
node print-agent.mjs`}</Cmd>
          <p>
            Асахдаа <code>Khevlekh-Uul print agent starting</code> гэж бичээд
            чимээгүй хүлээнэ — энэ хэвийн. Хэрэглэгч «Local agent»-аар файл
            илгээмэгц <code>claimed 1 job(s)</code> гарч принтер хэвлэнэ.
          </p>
        </Step>

        <Step n="6" title="Туршилт">
          <p>
            Хэрэглэгчээр нэвтэр (хэтэвчиндээ мөнгөтэй) → <strong>Хэвлэх</strong>{" "}
            → жижиг PDF → энэ принтер → <strong>Хэвлэлт илгээх</strong> →{" "}
            <strong>Local agent</strong>. Хэдхэн секундэд терминалд{" "}
            <code>job … printed</code> гарч принтер хэвлэвэл бэлэн! 🎉
          </p>
        </Step>

        <Step n="7" title="Байнга ажиллуулах (сонголт)">
          <p>
            Терминалыг хаахад скрипт зогсоно. Компьютер асахад автоматаар
            ажиллуулахын тулд <code>pm2</code> ашиглах нь хамгийн хялбар
            (эхлээд Алхам 5-ын env утгуудаа тохируулсан байх ёстой):
          </p>
          <Cmd>{`npm i -g pm2
pm2 start print-agent.mjs
pm2 save`}</Cmd>
          <p>
            Эсвэл: Linux дээр systemd unit (<code>Restart=always</code>),
            Windows дээр{" "}
            <a
              className="text-brand-600 underline"
              href="https://nssm.cc/"
              target="_blank"
              rel="noreferrer"
            >
              NSSM
            </a>
            -ээр service болго. Дэлгэрэнгүй: <code>agent/README.md</code>.
          </p>
        </Step>
      </div>

      {/* Daily operation */}
      <details className="group mt-3 rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none p-4 font-medium text-slate-800">
          🕘 Өдөр тутмын хэрэглээ
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 space-y-2">
          <p>
            <strong>Асаах:</strong> компьютер асаад скрипт ажиллаж байхад л
            хангалттай (pm2/service тохируулсан бол өөрөө асна). Гараар бол
            Алхам 5-ын командыг дахин ажиллуул.
          </p>
          <p>
            <strong>Скрипт унтарсан үед:</strong> ажлууд{" "}
            <strong>алга болохгүй</strong> — үүлэн системд дараалалд хүлээгээд,
            скрипт асмагц бүгд дарааллаараа хэвлэгдэнэ. (n8n замаас ялгаатай нь
            энд шууд буцаан төлөлт хийгддэггүй; хэвлэх үед алдаа гарвал л
            буцаан төлөлт хийнэ.) Урт хаалттай үед админаар принтерээ идэвхгүй
            болгуул.
          </p>
          <p>
            <strong>Хоёр зам зэрэг байж болно:</strong> нэг принтер дээр
            Telegram/n8n тохиргоо ба standalone скрипт хоёул идэвхтэй байж
            болно — хэрэглэгч аль аргаар илгээснээс хамаарч тухайн зам нь
            ажиллана.
          </p>
        </div>
      </details>

      {/* Troubleshooting */}
      <details className="group mt-2 rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none p-4 font-medium text-slate-800">
          🛠 Түгээмэл асуудал
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 space-y-2">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <code>Missing config</code> — <code>AGENT_TOKEN</code>,{" "}
              <code>PRINTER_ID</code>, <code>OS_PRINTER</code>-ийн аль нэг нь
              дутуу. Гурвууланг нь тохируулж дахин ажиллуул.
            </li>
            <li>
              <code>unauthorized — check AGENT_TOKEN</code> — токен буруу.
              Админаас зөв токеноо дахин ав.
            </li>
            <li>
              <code>poll error: fetch failed</code> — интернэт эсвэл{" "}
              <code>APP_URL</code> буруу. Хөтчөөр сайтаа нээж шалга.
            </li>
            <li>
              <code>claimed … job(s)</code> гарсан ч хэвлэхгүй —{" "}
              <code>OS_PRINTER</code> нэр буруу (Алхам 2-ын яг нэр), Windows
              дээр <code>SUMATRA_PATH</code> зам буруу, эсвэл принтер
              унтраалттай. Гараар туршиж үз:{" "}
              <code>lp -d НЭР файл.pdf</code> (Linux) /{" "}
              <code>&quot;test&quot; | Out-Printer -Name &quot;НЭР&quot;</code>{" "}
              (Windows).
            </li>
            <li>
              Драйвер тусгай тохиргоо шаарддаг бол <code>PRINT_CMD</code>{" "}
              хувьсагчаар хэвлэх командыг бүрэн солиж болно, ж:{" "}
              <code>{`PRINT_CMD='lp -d {printer} -n {copies} -o media=A4 {file}'`}</code>
              .
            </li>
          </ul>
        </div>
      </details>
    </section>
  );
}
